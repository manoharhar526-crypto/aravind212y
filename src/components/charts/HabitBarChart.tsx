import { Habit } from "@/types/habit";
import { getDaysInMonth, calculateCompletionRate } from "@/lib/habitUtils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card } from "@/components/ui/card";

interface HabitBarChartProps {
  habits: Habit[];
  currentMonth: Date;
}

export const HabitBarChart = ({ habits, currentMonth }: HabitBarChartProps) => {
  const daysInMonth = getDaysInMonth(currentMonth);
  
  const COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
    "hsl(142, 60%, 40%)",
    "hsl(221, 70%, 45%)",
    "hsl(262, 70%, 50%)",
    "hsl(25, 80%, 45%)",
    "hsl(340, 70%, 45%)",
  ];

  const data = habits.map((habit, index) => ({
    name: habit.name.length > 12 ? habit.name.substring(0, 12) + "..." : habit.name,
    fullName: habit.name,
    completion: calculateCompletionRate(habit, daysInMonth),
    days: habit.completedDays.length,
    fill: COLORS[index % COLORS.length],
  }));

  return (
    <Card className="p-6 animate-slide-up bg-card border-border" style={{ animationDelay: "200ms" }}>
      <h3 className="text-lg font-semibold mb-4 text-foreground">Habit Completion Rates</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis
              type="number"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              tickFormatter={(value) => `${value}%`}
              domain={[0, 100]}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              width={75}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                color: "hsl(var(--foreground))",
              }}
              formatter={(value: number, name: string, props: any) => [
                `${value}% (${props.payload.days}/${daysInMonth} days)`,
                props.payload.fullName,
              ]}
              labelFormatter={() => ""}
            />
            <Bar dataKey="completion" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
