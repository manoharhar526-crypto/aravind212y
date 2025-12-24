import { Habit } from "@/types/habit";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card } from "@/components/ui/card";

interface HabitPieChartProps {
  habits: Habit[];
}

export const HabitPieChart = ({ habits }: HabitPieChartProps) => {
  const data = habits.map((habit, index) => ({
    name: habit.name,
    value: habit.completedDays.length,
    fill: `hsl(0, 0%, ${90 - index * (70 / habits.length)}%)`,
  }));

  const totalCompleted = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="p-6 animate-slide-up bg-card border-border" style={{ animationDelay: "100ms" }}>
      <h3 className="text-lg font-semibold mb-4 text-foreground">Habit Distribution</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              stroke="hsl(var(--background))"
              strokeWidth={2}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                color: "hsl(var(--foreground))",
              }}
              formatter={(value: number, name: string) => [
                `${value} days (${Math.round((value / totalCompleted) * 100)}%)`,
                name,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        {data.slice(0, 5).map((item, index) => (
          <div key={index} className="flex items-center gap-1 text-xs">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.fill }}
            />
            <span className="text-muted-foreground truncate max-w-20">{item.name}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};
