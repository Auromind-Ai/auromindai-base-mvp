import {
  MessageSquare, Users, Sparkles, HelpCircle, Filter, Split, Bell, Send, Zap, Bot
} from 'lucide-react';

export const MAX_BUTTONS = 3;
export const DEFAULT_MESSAGE_TYPE = 'text';
export const MAX_KEYWORDS = 10;

export const TRIGGERS = [
  { id: 'msg_recv', label: 'Message Received', icon: MessageSquare, color: 'text-indigo-400' },
];

export const ACTIONS = [
  { id: 'send_msg', label: 'Send Message', icon: Send },
  { id: 'assign_agent', label: 'Assign Agent', icon: Users },
  { id: 'brain_query', label: 'Brain Query', icon: Sparkles },
  { id: 'ask_question',  label: 'Ask Question',  icon: HelpCircle },
  { id: 'condition',     label: 'Decision',      icon: Filter },
  { id: 'move_stage', label: 'Move Deal', icon: Split },
  { id: 'notification', label: 'Notify', icon: Bell },
];

export const getIcon = (type) => {
  const all = [...TRIGGERS, ...ACTIONS, { id: 'condition', icon: Filter }, { id: 'trigger', icon: Zap }];
  return all.find(i => i.id === type)?.icon || Bot;
};

export const createDefaultButton = (index) => ({
  id: `button-${Date.now()}-${index}`,
  label: `Option ${index + 1}`,
  value: `option_${index + 1}`,
  target: null,
});

export const normalizeButtons = (buttons = []) =>
  buttons.slice(0, MAX_BUTTONS).map((button, index) => ({
    id: button.id || `button-${index}`,
    label: button.label || '',
    value: button.value || '',
    target: button.target || null,
  }));

export const getNodeButtons = (node) => {
  const config = node?.config || {};
  const messageType = config.message_type || DEFAULT_MESSAGE_TYPE;
  if (config.type !== 'send_msg' || !['button', 'button_message'].includes(messageType)) {
    return [];
  }
  return normalizeButtons(config.buttons || []);
};

export const isButtonMessageNode = (node) => getNodeButtons(node).length > 0;

export const isConditionNode = (node) => {
  const config = node?.config || {};
  return node?.type === 'action' && config.type === 'condition';
};

export const getNodeBranches = (node) => {
  if (!isConditionNode(node)) return [];
  const config = node?.config || {};
  const branches = config.branches || [];
  if (branches.length >= 2) return branches;
  return [
    { id: 'branch-true', label: 'If True', value: 'true', target: null },
    { id: 'branch-false', label: 'If False', value: 'false', target: null },
  ];
};

export const isMultiPathNode = (node) => isButtonMessageNode(node) || isConditionNode(node);

export const getHandleIdForButton = (button, index) => button.value || button.id || `button-${index}`;

export const buildOutgoingMap = (edges = []) => edges.reduce((acc, edge) => {
  if (!acc[edge.source]) acc[edge.source] = [];
  acc[edge.source].push(edge);
  return acc;
}, {});

export const formatDelay = (amount, unit) => {
  if (!amount || amount === 0) return null;
  let u = unit;
  if (unit === 'hours') u = amount === 1 ? 'hr' : 'hrs';
  else if (unit === 'minutes') u = amount === 1 ? 'min' : 'mins';
  else if (unit === 'seconds') u = amount === 1 ? 'sec' : 'secs';
  return `${amount} ${u} delay`;
};

export const normalizeTriggerType = (triggerType) => {
  const SUPPORTED_TRIGGERS = ['msg_recv'];
  return SUPPORTED_TRIGGERS.includes(triggerType) ? triggerType : 'msg_recv';
};

export const sanitizeFlowData = (flow) => {
  if (!flow) return flow;

  const nodes = flow.nodes || [];
  const edges = flow.edges || [];

  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
  const multiPathNodeIds = new Set(
    nodes
      .filter(node => isMultiPathNode(node))
      .map(n => n.id)
  );

  const seenSources = new Set();
  const sanitizedEdges = edges.reduce((acc, edge) => {
    if (multiPathNodeIds.has(edge.source)) {
      acc.push(edge);
    } else {
      if (!seenSources.has(edge.source)) {
        seenSources.add(edge.source);
        acc.push({ ...edge, sourceHandle: null });
      }
    }
    return acc;
  }, []);

  return {
    ...flow,
    trigger_type: normalizeTriggerType(flow.trigger_type),
    nodes: nodes.map(node => {
      if (node.type === 'trigger' && node.config?.event) {
        return {
          ...node,
          config: { ...node.config, event: normalizeTriggerType(node.config.event) },
        };
      }
      return node;
    }),
    edges: sanitizedEdges,
  };
};

export const validateFlowGraph = (nodes = [], edges = []) => {
  const errors = [];
  const warnings = [];
  const nodeIds = new Set(nodes.map((node) => node.id));
  const triggerNodes = nodes.filter((node) => node.type === 'trigger');
  const reachableNodeIds = new Set();
  const reachableEdgeIds = new Set();
  const disconnectedNodeIds = [];
  const outgoingMap = buildOutgoingMap(edges);

  if (triggerNodes.length === 0) {
    errors.push('A flow must include exactly one trigger.');
  } else if (triggerNodes.length > 1) {
    errors.push('Only one trigger is allowed per flow.');
  }

  edges.forEach((edge) => {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      errors.push(`Connection ${edge.id} points to a missing node.`);
    }
    if (edge.source === edge.target) {
      errors.push(`Connection ${edge.id} cannot point back to the same node.`);
    }
    const targetNode = nodes.find((node) => node.id === edge.target);
    if (targetNode?.type === 'trigger') {
      errors.push(`Connection ${edge.id} cannot target the trigger.`);
    }
  });

  if (triggerNodes.length === 1) {
    const [triggerNode] = triggerNodes;
    if (nodes.length > 1 && !(outgoingMap[triggerNode.id] || []).length) {
      errors.push('The trigger must have at least one outgoing connection.');
    }
    const queue = [triggerNode.id];
    while (queue.length > 0) {
      const currentId = queue.shift();
      if (reachableNodeIds.has(currentId)) continue;
      reachableNodeIds.add(currentId);
      (outgoingMap[currentId] || []).forEach((edge) => {
        reachableEdgeIds.add(edge.id);
        if (!reachableNodeIds.has(edge.target)) queue.push(edge.target);
      });
    }
  }

  nodes.forEach((node) => {
    if (node.type === 'action' && node.config?.type === 'send_msg') {
      const text = node.config?.text || '';
      const msgType = node.config?.message_type || 'text';
      const isMediaType = ['image', 'video', 'document'].includes(msgType);
      if (!isMediaType && !text.trim()) {
        errors.push(`Node "${node.label || node.id}" has no message text. Please add text before saving.`);
      }
      if (isMediaType && !(node.config?.media_url || '').trim()) {
        errors.push(`Node "${node.label || node.id}" has no media URL. Please add a URL before saving.`);
      }
      if (msgType === 'button_message') {
        const buttons = node.config?.buttons || [];
        if (buttons.length === 0) errors.push(`Node "${node.label || node.id}" is a button message but has no buttons.`);
        buttons.forEach((btn, i) => {
          if (!btn.label?.trim()) errors.push(`Button ${i + 1} in "${node.label}" has no label.`);
          if (!btn.value?.trim()) errors.push(`Button ${i + 1} in "${node.label}" has no value.`);
          if (!btn.target) errors.push(`Button "${btn.label || i + 1}" in "${node.label}" is not connected to any node.`);
        });
      }
    }

    const outgoingEdges = outgoingMap[node.id] || [];
    if (!outgoingEdges.length) return;

    if (!isMultiPathNode(node) && outgoingEdges.some((edge) => edge.sourceHandle)) {
      errors.push(`Node "${node.label || node.id}" uses branching but is not a button or condition node.`);
    }

    if (isConditionNode(node)) {
      const handles = new Set(outgoingEdges.filter(e => e.sourceHandle).map(e => e.sourceHandle));
      if (!handles.has('true') || !handles.has('false')) {
        errors.push(`Condition node "${node.label || node.id}" must have both "true" and "false" branches connected.`);
      }
    }
  });

  nodes.forEach((node) => {
    if (node.type === 'trigger') return;

    const isConnected = edges.some(
      (edge) => edge.source === node.id || edge.target === node.id
    );

    if (!isConnected) {
      disconnectedNodeIds.push(node.id);
    } else if (triggerNodes.length === 1 && !reachableNodeIds.has(node.id)) {
      disconnectedNodeIds.push(node.id);
    }
  });

  const uniqueDisconnectedNodeIds = [...new Set(disconnectedNodeIds)];
  if (uniqueDisconnectedNodeIds.length > 0) {
    const pluralSuffix = uniqueDisconnectedNodeIds.length > 1 ? 's are' : ' is';
    warnings.push(`${uniqueDisconnectedNodeIds.length} node${pluralSuffix} disconnected or unreachable from the trigger.`);
    errors.push('Every node must be connected to the trigger path before saving.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    reachableNodeIds,
    reachableEdgeIds,
    disconnectedNodeIds: new Set(uniqueDisconnectedNodeIds),
  };
};

export const wouldCreateCycle = (sourceId, targetId, currentEdges) => {
  const visited = new Set();
  const queue = [targetId];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === sourceId) return true;
    if (!visited.has(current)) {
      visited.add(current);
      currentEdges.filter(e => e.source === current).forEach(e => queue.push(e.target));
    }
  }
  return false;
};
