// 'use client';

// import { useEffect, useState } from 'react';
// import {
//     Shield,
//     Zap,
//     Lock,
//     Eye,
//     Activity,
//     CheckCircle2,
//     AlertTriangle,
//     XCircle,
//     ChevronRight,
//     Search,
//     Filter
// } from 'lucide-react';
// import { useAuth } from '@/context/AuthContext';
// import api from '@/lib/api';
// import EmptyState from '@/components/EmptyState';
// import styles from './ai-control.module.css';

// export default function AIControlPage() {
//     const { workspaceId } = useAuth();
//     const [rules, setRules] = useState(null);
//     const [actions, setActions] = useState([]);
//     const [filter, setFilter] = useState('all');
//     const [loading, setLoading] = useState(true);

//     useEffect(() => {
//         if (workspaceId) {
//             loadData(workspaceId);
//         }
//     }, [filter, workspaceId]);

//     const loadData = async (workspaceId) => {
//         setLoading(true);
//         try {
//             const rulesResponse = await api.getMCPRules(workspaceId);
//             setRules(rulesResponse.rules);

//             const filterParam = filter === 'all' ? null : filter;
//             const actionsResponse = await api.getAIActions(workspaceId, filterParam);
//             setActions(actionsResponse.actions);
//         } catch (error) {
//             console.error('Failed to load AI control data:', error);
//         } finally {
//             setLoading(false);
//         }
//     };

//     const handleOverride = async (actionId, approved) => {
//         try {
//             await api.overrideDecision(actionId, approved);
//             if (workspaceId) loadData(workspaceId);
//         } catch (error) {
//             console.error('Failed to override decision:', error);
//             alert('Failed to override decision');
//         }
//     };

//     const getDecisionClass = (decision) => {
//         switch (decision) {
//             case 'allow': return styles.decisionAllow;
//             case 'escalate': return styles.decisionEscalate;
//             case 'block': return styles.decisionBlock;
//             default: return '';
//         }
//     };

//     return (
//         <div className={styles.aiControl}>
//             <div className={styles.header}>
//                 <h1>AI Control Center</h1>
//                 <p>Model Context Protocol (MCP) Governance Dashboard</p>
//             </div>

//             {/* MCP Rules Section */}
//             <div className={styles.section}>
//                 <h2>Active Governance Rules</h2>
//                 <p className={styles.sectionSubtitle}>These rules define the guardrails for your AI Assistant.</p>

//                 {rules ? (
//                     <div className={styles.rulesGrid}>
//                         <div className={`${styles.ruleCard} ${styles.active}`}>
//                             <div className={styles.ruleIcon}><Lock size={20} /></div>
//                             <div className={styles.ruleInfo}>
//                                 <div className={styles.ruleTitle}>No Auto-Spending</div>
//                                 <div className={styles.ruleDesc}>AI cannot authorize payments without manual oversight.</div>
//                             </div>
//                         </div>

//                         <div className={`${styles.ruleCard} ${styles.warning}`}>
//                             <div className={styles.ruleIcon}><Activity size={20} /></div>
//                             <div className={styles.ruleInfo}>
//                                 <div className={styles.ruleTitle}>Follow-up Limit</div>
//                                 <div className={styles.ruleDesc}>Max {rules.max_followups_per_conversation} follow-ups per conversation.</div>
//                             </div>
//                         </div>

//                         <div className={`${styles.ruleCard} ${styles.active}`}>
//                             <div className={styles.ruleIcon}><Shield size={20} /></div>
//                             <div className={styles.ruleInfo}>
//                                 <div className={styles.ruleTitle}>Sensitive Detection</div>
//                                 <div className={styles.ruleDesc}>Escalates sensitive content to human operator.</div>
//                             </div>
//                         </div>

//                         <div className={`${styles.ruleCard} ${styles.active}`}>
//                             <div className={styles.ruleIcon}><Zap size={20} /></div>
//                             <div className={styles.ruleInfo}>
//                                 <div className={styles.ruleTitle}>Confidence Minimum</div>
//                                 <div className={styles.ruleDesc}>Requires {(rules.min_confidence_threshold * 100).toFixed(0)}% model confidence.</div>
//                             </div>
//                         </div>
//                     </div>
//                 ) : (
//                     <div className="loading">Checking guardrails...</div>
//                 )}
//             </div>

//             {/* Audit Log Section */}
//             <div className={styles.section}>
//                 <h2>AI Actions Audit Log</h2>
//                 <div className={styles.logContainer}>
//                     <div className={styles.logHeader}>
//                         <div className={styles.filterGroup}>
//                             <button className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`} onClick={() => setFilter('all')}>All Actions</button>
//                             <button className={`${styles.filterBtn} ${filter === 'allow' ? styles.active : ''}`} onClick={() => setFilter('allow')}>Allowed</button>
//                             <button className={`${styles.filterBtn} ${filter === 'escalate' ? styles.active : ''}`} onClick={() => setFilter('escalate')}>Escalated</button>
//                             <button className={`${styles.filterBtn} ${filter === 'block' ? styles.active : ''}`} onClick={() => setFilter('block')}>Blocked</button>
//                         </div>
//                         <div className={styles.iconBtn}><Filter size={18} /></div>
//                     </div>

//                     {loading ? (
//                         <div style={{ textAlign: 'center', padding: '4rem' }}><div className="loading"></div></div>
//                     ) : actions.length === 0 ? (
//                         <EmptyState icon={Activity} title="No actions logged" description="Start using AI features to see governance decisions here." />
//                     ) : (
//                         <div className={styles.logList}>
//                             {actions.map((action) => (
//                                 <div key={action.id} className={styles.actionItem}>
//                                     <div className={styles.actionIconMain}>
//                                         {action.action_type === 'send_message' ? <Zap size={18} /> :
//                                             action.action_type === 'marketing' ? <Activity size={18} /> : <Shield size={18} />}
//                                     </div>
//                                     <div className={styles.itemContent}>
//                                         <div className={styles.itemHeader}>
//                                             <div className={styles.typeWrapper}>
//                                                 <span className={styles.typeBadge}>{action.action_type}</span>
//                                                 <span className={styles.time}>{new Date(action.created_at).toLocaleString()}</span>
//                                             </div>
//                                             <span className={`${styles.decisionBadge} ${getDecisionClass(action.mcp_decision)}`}>
//                                                 {action.mcp_decision?.toUpperCase()}
//                                             </span>
//                                         </div>

//                                         <div className={styles.intent}>{action.intent}</div>

//                                         <div className={styles.itemMeta}>
//                                             <div className={styles.metaItem}><strong>Confidence:</strong> {(action.confidence * 100).toFixed(0)}%</div>
//                                             <div className={styles.metaItem}><strong>Reason:</strong> {action.mcp_reason}</div>
//                                         </div>

//                                         {action.mcp_decision === 'escalate' && !action.human_override && (
//                                             <div className={styles.overrideSection}>
//                                                 <button className={`${styles.overrideBtn} ${styles.approveBtn}`} onClick={() => handleOverride(action.id, true)}>Approve Action</button>
//                                                 <button className={`${styles.overrideBtn} ${styles.rejectBtn}`} onClick={() => handleOverride(action.id, false)}>Reject Action</button>
//                                             </div>
//                                         )}

//                                         {action.human_override && (
//                                             <div className={styles.overrideBadge}>
//                                                 <CheckCircle2 size={12} /> Human Override Applied
//                                             </div>
//                                         )}
//                                     </div>
//                                 </div>
//                             ))}
//                         </div>
//                     )}
//                 </div>
//             </div>
//         </div>
//     );
// }
