
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { AudienceProfile } from '../../types';

interface AudienceChartsProps {
  profile: AudienceProfile;
  totalViews: number;
}

const COLORS_GENDER = ['#4299E1', '#F56565'];
const COLORS_AGE = ['#4FD1C5', '#4299E1', '#F6E05E', '#F56565', '#B794F4'];

const ChartCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-gray-900/50 p-4 rounded-lg h-80 flex flex-col">
        <h4 className="font-semibold text-gray-200 mb-4 text-center flex-shrink-0">{title}</h4>
        <div className="flex-grow min-h-0 w-full">
            {children}
        </div>
    </div>
);

const AudienceCharts: React.FC<AudienceChartsProps> = ({ profile, totalViews }) => {
  const CustomAgeTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = data.value;
      const estimatedViews = Math.round((totalViews * percentage) / 100);
      return (
        <div className="bg-gray-900/80 p-3 rounded-lg border border-gray-700 text-sm z-50">
          <p className="font-bold" style={{ color: data.payload.fill }}>{data.name}</p>
          <p className="text-gray-300">비율: {percentage}%</p>
          <p className="text-gray-300">추정 시청자 수: {estimatedViews.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ChartCard title="성별 분포 (추정)">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie data={profile.genderRatio} dataKey="value" nameKey="label" cx="50%" cy="45%" outerRadius={80} label>
                        {profile.genderRatio.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS_GENDER[index % COLORS_GENDER.length]} />
                        ))}
                    </Pie>
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568', borderRadius: '8px' }} 
                        itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                        formatter={(value: number) => [`${value}%`, '비중']}
                    />
                    <Legend iconSize={10} wrapperStyle={{fontSize: "12px", bottom: 0}}/>
                </PieChart>
            </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="연령대 분포 (추정)">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie data={profile.ageGroups} dataKey="value" nameKey="label" cx="50%" cy="45%" outerRadius={80} label>
                        {profile.ageGroups.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS_AGE[index % COLORS_AGE.length]} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomAgeTooltip />} />
                    <Legend iconSize={10} wrapperStyle={{fontSize: "12px", bottom: 0}}/>
                </PieChart>
            </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="주요 시청 국가 (추정)">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={profile.topCountries} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="label" tick={{ fill: '#A0AEC0', fontSize: 12 }} width={60} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568', color: '#CBD5E0' }}
                        cursor={{ fill: 'rgba(74, 85, 104, 0.3)' }}
                        formatter={(value: number) => `${value}%`}
                    />
                    <Bar dataKey="value" fill="#4FD1C5" background={{ fill: '#2D3748' }} />
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
    </div>
  );
};

export default AudienceCharts;
