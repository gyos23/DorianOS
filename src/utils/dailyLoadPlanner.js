/**
 * Daily Load Planner Engine for DorianOS
 * 
 * Ported & enhanced from OmniFocus DailyLoadPlanner.omnijs (v7.0 by Dorian Liriano)
 * 
 * Realistically determines how many tasks can be performed today given:
 * 1. Start time & End time
 * 2. Protected buffer reserve (default 20%)
 * 3. Duration of task (via tags, estimatedMinutes, or smart fallbacks)
 * 4. Energy & mental capacity (Deep work vs shallow work circadian slotting)
 * 5. Task priority (P1-P4 + flagged boost)
 * 6. Pillar context switching (Fortitude, Family, Finance, Forward, Freedom)
 * 
 * Backlog Architecture Note:
 * Structured with extensible slotting hooks ready for:
 * - All168 (168-hour weekly macro-allocation budget)
 * - ChronoFlow (continuous flow & circadian rhythm visual calendar)
 */

export const DEFAULT_WORK_CONFIG = {
  startHour: 9,
  startMinute: 0,
  endHour: 17,
  endMinute: 0,
  bufferPercent: 0.20, // 20% protected buffer for reality, slack, transitions
  strategy: "priority", // "priority" | "energy-circadian"
  maxDeepWorkMinutes: 210, // 3.5 hours max high cognitive load per day
};

export const RESCHEDULE_OFFSETS = [
  { value: 1, label: "Tomorrow (+1d)" },
  { value: 2, label: "In 2 days (+2d)" },
  { value: 3, label: "In 3 days (+3d)" },
  { value: 4, label: "In 4 days (+4d)" },
  { value: 5, label: "In 5 days (+5d)" },
  { value: 7, label: "Next week (+7d)" },
];

/**
 * Extract priority score from task tags or status:
 * 1 = Top, 2 = High, 3 = Normal, 4 = Low.
 * Flagged task gets a -0.5 boost (higher urgency).
 */
export function getTaskPriority(task, customOverride = null) {
  if (customOverride !== null && customOverride !== undefined) {
    return Number(customOverride);
  }

  const tags = Array.isArray(task.tags) ? task.tags : [];
  let basePriority = 3; // Default Normal

  for (const tag of tags) {
    const tn = (tag || "").toLowerCase();
    if (tn.startsWith("p") && (tn.includes("top") || tn.includes("1"))) {
      basePriority = 1;
      break;
    }
    if (tn.startsWith("p") && (tn.includes("high") || tn.includes("2"))) {
      basePriority = 2;
      break;
    }
    if (tn.startsWith("p") && (tn.includes("normal") || tn.includes("nrm") || tn.includes("3"))) {
      basePriority = 3;
      break;
    }
    if (tn.startsWith("p") && (tn.includes("low") || tn.includes("4"))) {
      basePriority = 4;
      break;
    }
  }

  // Also check task name tags like #p1, #top, etc.
  if (basePriority === 3 && task.name) {
    const nameLower = task.name.toLowerCase();
    if (nameLower.includes("#p1") || nameLower.includes("#top")) basePriority = 1;
    else if (nameLower.includes("#p2") || nameLower.includes("#high")) basePriority = 2;
    else if (nameLower.includes("#p3")) basePriority = 3;
    else if (nameLower.includes("#p4") || nameLower.includes("#low")) basePriority = 4;
  }

  // Flagged bonus (-0.5 priority score means higher sorting precedence)
  if (task.flagged) {
    basePriority -= 0.5;
  }

  return basePriority;
}

export function priorityLabel(priorityScore) {
  if (priorityScore <= 1.0) return { code: "TOP", text: "Top Priority", color: "#EF4444" };
  if (priorityScore <= 2.0) return { code: "HIGH", text: "High Priority", color: "#F97316" };
  if (priorityScore <= 3.0) return { code: "NRM", text: "Normal", color: "#3B82F6" };
  return { code: "LOW", text: "Low Priority", color: "#64748B" };
}

/**
 * Extract duration in minutes from task tags, estimatedMinutes, or fallbacks:
 * T1. Low = 15m, T2. Manageable = 30m, T3. High = 60m.
 */
export function getTaskDuration(task, customOverride = null) {
  if (customOverride !== null && customOverride !== undefined) {
    const parsed = parseInt(customOverride, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  const tags = Array.isArray(task.tags) ? task.tags : [];

  for (const tag of tags) {
    const tn = (tag || "").trim();
    if (tn === "T1. Low" || tn === "T1") return 15;
    if (tn === "T2. Manageable" || tn === "T2") return 30;
    if (tn === "T3. High" || tn === "T3") return 60;

    // Check custom time tags like "15m", "30m", "45m", "1h", "2h"
    const mMatch = tn.match(/^(\d+)\s*(?:m|min|mins)$/i);
    if (mMatch) return parseInt(mMatch[1], 10);

    const hMatch = tn.match(/^([\d.]+)\s*(?:h|hr|hrs|hour|hours)$/i);
    if (hMatch) return Math.round(parseFloat(hMatch[1]) * 60);
  }

  // Check OmniFocus estimatedMinutes property
  if (task.estimatedMinutes && typeof task.estimatedMinutes === "number" && task.estimatedMinutes > 0) {
    return task.estimatedMinutes;
  }

  // Check task name for shorthand [15m], [30m], [1h], etc.
  if (task.name) {
    const nameTag = task.name.match(/\[(\d+)\s*(?:m|min)\]/i);
    if (nameTag) return parseInt(nameTag[1], 10);
    const nameHour = task.name.match(/\[([\d.]+)\s*(?:h|hr)\]/i);
    if (nameHour) return Math.round(parseFloat(nameHour[1]) * 60);
  }

  return 30; // Sensible default: 30 minutes
}

/**
 * Extract energy / cognitive capacity demand:
 * "high" (Deep Work / High Mental Capacity)
 * "medium" (Standard Execution)
 * "low" (Shallow / Admin / Chores)
 */
export function getTaskEnergy(task, customOverride = null) {
  if (customOverride) return customOverride;

  const tags = Array.isArray(task.tags) ? task.tags.map(t => (t || "").toLowerCase()) : [];
  const name = (task.name || "").toLowerCase();

  for (const tag of tags) {
    if (
      tag.includes("deep") ||
      tag.includes("high energy") ||
      tag.includes("e:high") ||
      tag.includes("focus") ||
      tag.includes("creative") ||
      tag.includes("strategy") ||
      tag.includes("code") ||
      tag.includes("write")
    ) {
      return "high";
    }
    if (
      tag.includes("low energy") ||
      tag.includes("e:low") ||
      tag.includes("shallow") ||
      tag.includes("admin") ||
      tag.includes("chores") ||
      tag.includes("quick") ||
      tag.includes("errand")
    ) {
      return "low";
    }
    if (tag.includes("medium") || tag.includes("e:med") || tag.includes("routine")) {
      return "medium";
    }
  }

  if (name.includes("#deep") || name.includes("#focus")) return "high";
  if (name.includes("#admin") || name.includes("#quick")) return "low";

  // Heuristic based on duration & priority:
  const duration = getTaskDuration(task);
  const priority = getTaskPriority(task);

  if (duration >= 60 || priority <= 1.5) return "high";
  if (duration <= 15) return "low";
  return "medium";
}

export const ENERGY_CONFIG = {
  high: {
    label: "Deep Focus",
    shortLabel: "High",
    icon: "⚡",
    color: "#8B5CF6", // Purple
    bg: "#8B5CF618",
    description: "High cognitive capacity / uninterrupted flow",
  },
  medium: {
    label: "Standard",
    shortLabel: "Med",
    icon: "⚙️",
    color: "#3B82F6", // Blue
    bg: "#3B82F618",
    description: "Normal execution & collaboration",
  },
  low: {
    label: "Shallow / Admin",
    shortLabel: "Low",
    icon: "☕",
    color: "#10B981", // Emerald
    bg: "#10B98118",
    description: "Low mental demand / administrative",
  },
};

/**
 * Extract life pillar from task tags or project name
 * DorianOS 5 Pillars: Fortitude, Family, Finance, Forward, Freedom
 */
export function getTaskPillar(task) {
  const haystack = [
    ...(Array.isArray(task.tags) ? task.tags : []),
    task.project || "",
  ].map(s => (s || "").toLowerCase());

  for (const s of haystack) {
    if (s.includes("fortitude")) return "Fortitude";
    if (s.includes("family")) return "Family";
    if (s.includes("finance") || s.includes("financial")) return "Finance";
    if (s.includes("forward")) return "Forward";
    if (s.includes("freedom")) return "Freedom";
  }
  return null;
}

export function formatTimeSlot(startMins, durationMins) {
  const startHour = Math.floor(startMins / 60);
  const startMin = startMins % 60;
  const endMins = startMins + durationMins;
  const endHour = Math.floor(endMins / 60);
  const endMin = endMins % 60;

  const startStr = `${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}`;
  const endStr = `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`;

  return { startStr, endStr, label: `${startStr}–${endStr}` };
}

/**
 * Core Load Planning & Realistic Scheduling Algorithm
 */
export function planDailyLoad(candidateTasks = [], config = {}) {
  const {
    startHour = DEFAULT_WORK_CONFIG.startHour,
    startMinute = DEFAULT_WORK_CONFIG.startMinute,
    endHour = DEFAULT_WORK_CONFIG.endHour,
    endMinute = DEFAULT_WORK_CONFIG.endMinute,
    bufferPercent = DEFAULT_WORK_CONFIG.bufferPercent,
    strategy = DEFAULT_WORK_CONFIG.strategy,
    maxDeepWorkMinutes = DEFAULT_WORK_CONFIG.maxDeepWorkMinutes,
    overrides = {}, // map of taskId -> { duration, priority, energy, action: 'keep' | 'move', moveOffset }
  } = config;

  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;
  const totalMinutes = Math.max(0, endTotalMinutes - startTotalMinutes);
  const bufferMinutes = Math.floor(totalMinutes * bufferPercent);
  const availableMinutes = totalMinutes - bufferMinutes;

  // 1. Enrich tasks with duration, priority, energy, pillar, and apply overrides
  const enrichedTasks = [];
  const triagedOutTasks = [];

  for (const t of candidateTasks) {
    const o = overrides[t.id] || {};
    if (o.action === "move") {
      triagedOutTasks.push({
        task: t,
        moveOffset: o.moveOffset || 1,
      });
      continue;
    }

    const duration = getTaskDuration(t, o.duration);
    const priority = getTaskPriority(t, o.priority);
    const energy = getTaskEnergy(t, o.energy);
    const pillar = getTaskPillar(t);

    enrichedTasks.push({
      task: t,
      duration,
      priority,
      energy,
      pillar,
    });
  }

  // 2. Sort according to strategy
  const sortedTasks = [...enrichedTasks];

  if (strategy === "energy-circadian") {
    // ChronoFlow Circadian Strategy:
    // Front-load High energy into peak hours, slot low energy during mid-day dip,
    // balancing priority within each energy bracket.
    const energyOrder = { high: 1, medium: 2, low: 3 };
    sortedTasks.sort((a, b) => {
      // If priority is top tier (<= 1.5), priority still rules
      if (a.priority <= 1.5 && b.priority > 1.5) return -1;
      if (b.priority <= 1.5 && a.priority > 1.5) return 1;

      // Group by energy first
      const eDiff = energyOrder[a.energy] - energyOrder[b.energy];
      if (eDiff !== 0) return eDiff;

      // Then by priority
      return a.priority - b.priority;
    });
  } else {
    // Strict Priority Strategy (OmniJS standard):
    sortedTasks.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.duration - a.duration; // bigger high-priority tasks first
    });
  }

  // 3. Realistic capacity slot allocation
  const scheduledTasks = [];
  const overflowTasks = [];
  let totalScheduled = 0;
  let totalDeepWork = 0;
  let currentSlotMinute = startTotalMinutes;
  let lastPillar = null;
  let contextSwitches = 0;

  for (const item of sortedTasks) {
    if (totalScheduled + item.duration <= availableMinutes) {
      const slot = formatTimeSlot(currentSlotMinute, item.duration);

      if (lastPillar && item.pillar && item.pillar !== lastPillar) {
        contextSwitches++;
      }
      if (item.pillar) lastPillar = item.pillar;

      if (item.energy === "high") {
        totalDeepWork += item.duration;
      }

      scheduledTasks.push({
        ...item,
        timeSlot: slot.label,
        startTime: slot.startStr,
        endTime: slot.endStr,
        scheduledStartMins: currentSlotMinute,
      });

      currentSlotMinute += item.duration;
      totalScheduled += item.duration;
    } else {
      overflowTasks.push(item);
    }
  }

  const totalCommitted = enrichedTasks.reduce((sum, t) => sum + t.duration, 0);
  const overflowMinutes = overflowTasks.reduce((sum, t) => sum + t.duration, 0);

  const stats = {
    totalWindowMinutes: totalMinutes,
    availableMinutes,
    bufferMinutes,
    totalCommittedMinutes: totalCommitted,
    scheduledMinutes: totalScheduled,
    overflowMinutes,
    remainingBufferMinutes: Math.max(0, availableMinutes - totalScheduled),
    loadPercentage: availableMinutes > 0 ? Math.round((totalCommitted / availableMinutes) * 100) : 0,
    isOverCapacity: totalCommitted > availableMinutes,
    overByMinutes: Math.max(0, totalCommitted - availableMinutes),
    totalDeepWorkMinutes: totalDeepWork,
    deepWorkWarning: totalDeepWork > maxDeepWorkMinutes,
    contextSwitches,
    taskCount: enrichedTasks.length,
    scheduledCount: scheduledTasks.length,
    overflowCount: overflowTasks.length,
  };

  return {
    scheduledTasks,
    overflowTasks,
    triagedOutTasks,
    stats,
    config: {
      startHour,
      startMinute,
      endHour,
      endMinute,
      bufferPercent,
      strategy,
      maxDeepWorkMinutes,
    },
  };
}
