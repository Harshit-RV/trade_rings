import { LineChart, Line, CartesianGrid, XAxis, YAxis, Legend, Tooltip } from 'recharts';

export default function HoldingsChart({data,x_axis,y_axis}: {data: {x: string, y: number}[],x_axis: string,y_axis: string}) {
    return <div className='flex-shrink-0 bg-[#000000]/50 h-min py-7 pr-6 rounded-4xl gap-5 flex flex-col border-[rgba(255,255,255,0.15)] backdrop-blur-[10px]'>
        <LineChart style={{ width: '100%', aspectRatio: 1.618, maxWidth: 600 }} responsive data={data}>
            <CartesianGrid stroke="rgba(255,255,255,0.15)"/>
            <Line type="monotone" dataKey={y_axis} strokeWidth={2}/>
            <XAxis dataKey={x_axis} stroke="rgba(255,255,255,0.5)"/>
            <YAxis dataKey={y_axis} stroke="rgba(255,255,255,0.5)"/>

        </LineChart>
  </div>
}

