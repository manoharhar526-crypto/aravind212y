import { Task } from "@/types/task";
import { Card } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { getTasksByType, calculateTaskCompletionRate } from "@/lib/taskUtils";

interface TaskCompletionChartProps {
  tasks: Task[];
}

export const TaskCompletionChart = ({ tasks }: TaskCompletionChartProps) => {
  const generalTasks = getTasksByType(tasks, "general");
  const weeklyTasks = getTasksByType(tasks, "weekly");
  const monthlyTasks = getTasksByType(tasks, "monthly");
  const dailyTasks = getTasksByType(tasks, "daily");

  const data = [
    {
      name: "General",
      value: generalTasks.length,
      completed: generalTasks.filter(t => t.completed).length,
      rate: calculateTaskCompletionRate(generalTasks),
    },
    {
      name: "Weekly",
      value: weeklyTasks.length,
      completed: weeklyTasks.filter(t => t.completed).length,
      rate: calculateTaskCompletionRate(weeklyTasks),
    },
    {
      name: "Monthly",
      value: monthlyTasks.length,
      completed: monthlyTasks.filter(t => t.completed).length,
      rate: calculateTaskCompletionRate(monthlyTasks),
    },
    {
      name: "Daily",
      value: dailyTasks.length,
      completed: dailyTasks.filter(t => t.completed).length,
      rate: calculateTaskCompletionRate(dailyTasks),
    },
  ].filter(d => d.value > 0);

  const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"];

  return (
    <Card className="p-6 border-border">
      <h3 className="font-semibold mb-4">Task Distribution</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[index % COLORS.length]}
                stroke="hsl(var(--border))"
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
            formatter={(value: number, name: string, props) => [
              `${props.payload.completed}/${value} (${props.payload.rate}%)`,
              name
            ]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
};
