import React from 'react';

interface ViewershipHeatmapProps {
  data: number[][]; // 7 days (rows) x 24 hours (cols)
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const ViewershipHeatmap: React.FC<ViewershipHeatmapProps> = ({ data }) => {
  const maxActivity = Math.max(...data.flat(), 1);

  const getColor = (value: number) => {
    if (value === 0) return 'bg-gray-700/50';
    const intensity = Math.round((value / maxActivity) * 100);
    if (intensity < 20) return 'bg-blue-900';
    if (intensity < 40) return 'bg-blue-800';
    if (intensity < 60) return 'bg-blue-700';
    if (intensity < 80) return 'bg-blue-600';
    return 'bg-blue-500';
  };

  return (
    <div className="w-full overflow-x-auto">
        <div className="flex justify-end items-center gap-2 text-xs text-gray-400 mb-2">
            <span>적음</span>
            <div className="flex gap-0.5">
                <div className="w-3 h-3 rounded-sm bg-blue-900"></div>
                <div className="w-3 h-3 rounded-sm bg-blue-800"></div>
                <div className="w-3 h-3 rounded-sm bg-blue-700"></div>
                <div className="w-3 h-3 rounded-sm bg-blue-600"></div>
                <div className="w-3 h-3 rounded-sm bg-blue-500"></div>
            </div>
            <span>많음</span>
        </div>
        <table className="w-full border-separate" style={{ borderSpacing: '2px' }}>
            <thead>
                <tr>
                    <th className="w-12"></th>
                    {HOURS.map(hour => (
                        <th key={hour} className="text-xs font-normal text-gray-400 pb-1">
                            {hour % 3 === 0 ? `${hour}`.padStart(2, '0') : ''}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {DAYS.map((day, dayIndex) => (
                    <tr key={day}>
                        <td className="text-xs font-semibold text-gray-300 pr-2 text-right">{day}</td>
                        {data[dayIndex].map((activity, hourIndex) => (
                            <td key={hourIndex}>
                                <div
                                    className={`w-full h-6 rounded-sm ${getColor(activity)}`}
                                    title={`${day}요일 ${hourIndex}시: 활동량 ${activity}`}
                                ></div>
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
  );
};

export default ViewershipHeatmap;
