import styles from './StatCard.module.css';

export default function StatCard({ icon: Icon, value, label, trend, color = 'blue' }) {
    return (
        <div className={styles.statCard}>
            <div className={`${styles.iconWrapper} ${styles[color]}`}>
                <Icon size={20} strokeWidth={2.5} />
            </div>
            <div className={styles.content}>
                <div className={styles.value}>{value}</div>
                <div className={styles.label}>{label}</div>
                {trend && <div className={styles.trend}>{trend}</div>}
            </div>
        </div>
    );
}
