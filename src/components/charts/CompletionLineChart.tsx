import { Habit } from "@/types/habit";
import { getDaysInMonth, calculateDailyCompletion } from "@/lib/habitUtils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/card";

interface CompletionLineChartProps {
  habits: Habit[];
  currentMonth: Date;
}

export const CompletionLineChart = ({ habits, currentMonth }: CompletionLineChartProps) => {
  const daysInMonth = getDaysInMonth(currentMonth);
  
  const data = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    return {
      day,
      completion: calculateDailyCompletion(habits, day),
    };
  });

  return (
    <Card className="p-6 animate-slide-up bg-card border-border">
      <h3 className="text-lg font-semibold mb-4 text-foreground">Daily Completion Rate</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="day" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              tickFormatter={(value) => `${value}%`}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                color: "hsl(var(--foreground))",
              }}
              formatter={(value: number) => [`${value}%`, "Completion"]}
              labelFormatter={(label) => `Day ${label}`}
            />
            <Line
              type="monotone"
              dataKey="completion"
              stroke="hsl(var(--foreground))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--foreground))", strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: "hsl(var(--foreground))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
