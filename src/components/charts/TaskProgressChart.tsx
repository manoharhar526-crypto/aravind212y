import { Task } from "@/types/task";
import { Card } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { getTasksByType, getWeeklyTasksByWeek, calculateTaskCompletionRate, getWeeksInMonth } from "@/lib/taskUtils";

interface TaskProgressChartProps {
  tasks: Task[];
  currentMonth: Date;
}

export const TaskProgressChart = ({ tasks, currentMonth }: TaskProgressChartProps) => {
  const weeksInMonth = getWeeksInMonth(currentMonth);
  
  const weeklyData = Array.from({ length: weeksInMonth }, (_, i) => {
    const weekNum = i + 1;
    const weekTasks = getWeeklyTasksByWeek(tasks, weekNum);
    return {
      week: `W${weekNum}`,
      rate: calculateTaskCompletionRate(weekTasks),
      total: weekTasks.length,
      completed: weekTasks.filter(t => t.completed).length,
    };
  });

  const categoryData = [
    { name: "General", rate: calculateTaskCompletionRate(getTasksByType(tasks, "general")) },
    { name: "Monthly", rate: calculateTaskCompletionRate(getTasksByType(tasks, "monthly")) },
    { name: "Weekly", rate: calculateTaskCompletionRate(getTasksByType(tasks, "weekly")) },
    { name: "Daily", rate: calculateTaskCompletionRate(getTasksByType(tasks, "daily")) },
  ];

  return (
    <Card className="p-6 border-border">
      <h3 className="font-semibold mb-4">Task Completion by Category</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={categoryData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="name" 
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            axisLine={{ stroke: "hsl(var(--border))" }}
          />
          <YAxis 
            domain={[0, 100]}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            axisLine={{ stroke: "hsl(var(--border))" }}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
            formatter={(value: number) => [`${value}%`, "Completion"]}
          />
          <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
            {categoryData.map((_, index) => (
              <Cell 
                key={`cell-${index}`}
                fill={index % 2 === 0 ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};
