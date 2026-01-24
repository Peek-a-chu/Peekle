import { UserProfile } from '../types';

interface Props {
    user: UserProfile;
}

export function ProfileStatsRow({ user }: Props) {
    const stats = [
        {
            label: '현재 리그',
            value: user.league || 'UNRANKED',
            subValue: `${user.leaguePoint.toLocaleString()} LP`,
            icon: '🏆',
            color: 'text-yellow-600 bg-yellow-50',
            borderColor: 'border-yellow-100'
        },
        {
            label: '현재 스트릭',
            value: `${user.streakCurrent}일`,
            subValue: 'Keep it up!',
            icon: '🔥',
            color: 'text-orange-600 bg-orange-50',
            borderColor: 'border-orange-100'
        },
        {
            label: '최대 스트릭',
            value: `${user.streakMax}일`,
            subValue: 'Best Record',
            icon: '⚡',
            color: 'text-blue-600 bg-blue-50',
            borderColor: 'border-blue-100'
        },
    ];

    return (
        <div className="grid grid-cols-3 gap-4">
            {stats.map((stat, idx) => (
                <div key={idx} className={`rounded-2xl p-5 border ${stat.borderColor} bg-white flex items-center justify-between shadow-sm hover:shadow-md transition-shadow`}>
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">{stat.label}</p>
                        <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                        <p className="text-xs text-gray-400 mt-1 font-medium">{stat.subValue}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${stat.color}`}>
                        {stat.icon}
                    </div>
                </div>
            ))}
        </div>
    );
}
