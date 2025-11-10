import type { FC } from "react";
import { Box, useTheme } from "@mui/material";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface ProgressRingProps {
  completed: number;
  total: number;
  label: string;
  color: string;
}

export const ProgressRing: FC<ProgressRingProps> = ({
  completed,
  total,
  label,
  color,
}) => {
  const theme = useTheme();

  const data = [
    { name: "Completed", value: completed },
    { name: "Remaining", value: Math.max(0, total - completed) },
  ];

  const COLORS = [color, theme.palette.grey[200]];

  return (
    <Box sx={{ width: "100%", height: 250, position: "relative" }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={85} // Increased from 70
            outerRadius={100} // Increased from 90
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            stroke="none"
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
            {/* Adjusted dy for better vertical centering */}
            <tspan
              x="50%"
              dy="-0.4em"
              fontSize="32"
              fontWeight="bold"
              fill={color}
            >
              {completed}/{total}
            </tspan>
            <tspan
              x="50%"
              dy="2.0em"
              fontSize="16"
              fill={theme.palette.text.secondary}
            >
              {label}
            </tspan>
          </text>
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
};
