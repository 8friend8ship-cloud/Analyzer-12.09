import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis } from 'recharts';
import type { AudienceProfile } from '../../types';

interface AudienceChartsProps {
  profile: AudienceProfile;
  totalViews: number;
}

const COLORS = ['#4299E1', '#4FD1C5', '#F6E05E', '#F56565', '#B794F4', '#ED8936'];

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-gray-900/80 p-3 rounded-lg border border-gray-700 text-sm shadow-lg">
                <p className="font-bold" style={{ color: data.fill }}>{data.label || data.name}</p>
                <p className="text-gray-200 mt-1">비율 (Percentage): <span className="font-semibold">{data.value?.toFixed(1)}%</span></p>
            </div>
        );
    }
    return null;
};


const AudienceCharts: React.FC<AudienceChartsProps> = ({ profile }) => {
    if (!profile || (!profile.genderRatio?.length && !profile.ageGroups?.length && !profile.topCountries?.length)) {
        return (
            <div className="bg-gray-800/60 p-6 rounded-lg border border-gray-700/50 text-center text-gray-500">
                <p>시청자 인구 통계 데이터가 부족합니다. (Audience demographic data is insufficient.)</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {profile.genderRatio && profile.genderRatio.length > 0 && (
                <div className="bg-gray-800 p-4 rounded-lg h-80 flex flex-col">
                    <h4 className="font-semibold text-center mb-2 text-gray-300">성별 분포 (Gender)</h4>
                    <div className="flex-grow min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={profile.genderRatio} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                                    {profile.genderRatio.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend iconSize={10} wrapperStyle={{fontSize: "12px"}}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
            {profile.ageGroups && profile.ageGroups.length > 0 && (
                <div className="bg-gray-800 p-4 rounded-lg h-80 flex flex-col">
                    <h4 className="font-semibold text-center mb-2 text-gray-300">연령대 분포 (Age)</h4>
                    <div className="flex-grow min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={profile.ageGroups} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                <XAxis type="number" hide domain={[0, 100]} />
                                <YAxis type="category" dataKey="label" width={60} tick={{ fill: '#A0AEC0', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(74, 85, 104, 0.3)'}} />
                                <Bar dataKey="value" name="비율" barSize={20} radius={[0, 10, 10, 0]}>
                                    {profile.ageGroups.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
             {profile.topCountries && profile.topCountries.length > 0 && (
                <div className="bg-gray-800 p-4 rounded-lg h-80 flex flex-col">
                    <h4 className="font-semibold text-center mb-2 text-gray-300">상위 국가 분포 (Top Countries)</h4>
                    <div className="flex-grow min-h-0">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={profile.topCountries} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={80} labelLine={false} label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`}>
                                    {profile.topCountries.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AudienceCharts;