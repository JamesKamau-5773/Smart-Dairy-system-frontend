import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function MilkTrendChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={320}>
      <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis dataKey="day" tick={{ fontFamily: 'Inter', fontSize: 12, fill: '#6b7280', fontWeight: 600 }} axisLine={{ stroke: '#e5e7eb', strokeWidth: 1 }} tickLine={false} dy={10} />
        <YAxis tick={{ fontFamily: 'Inter', fontSize: 12, fill: '#6b7280', fontWeight: 600 }} axisLine={false} tickLine={false} dx={-10} />
        <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)', fontFamily: 'Inter', fontWeight: 'bold' }} />
        <Line type="monotone" dataKey="yield" stroke="#0369A1" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#ffffff', stroke: '#0369A1' }} activeDot={{ r: 6, fill: '#0369A1', stroke: '#38BDF8', strokeWidth: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
