import React from "react";
import { Box, Typography, Chip, useTheme } from "@mui/material";
import { motion } from "framer-motion";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";

interface Winner {
  id: string;
  name: string;
  totalScore: number;
  color?: string;
}

interface Props {
  winners: Winner[];
  type: "GROUP" | "HOUSE";
}

export const Podium: React.FC<Props> = ({ winners, type }) => {
  const theme = useTheme();

  // Use sessionStorage to persist animation state
  const storageKey = `podium-animated-${type}`;
  const [hasAnimated, setHasAnimated] = React.useState(() => {
    return sessionStorage.getItem(storageKey) === "true";
  });

  React.useEffect(() => {
    if (!hasAnimated) {
      setHasAnimated(true);
      sessionStorage.setItem(storageKey, "true");
    }
  }, [hasAnimated, storageKey]);

  const first = winners[0];
  const second = winners[1];
  const third = winners[2];

  const heights = { 1: 200, 2: 140, 3: 100 };

  const PodiumStep = ({
    player,
    rank,
  }: {
    player?: Winner;
    rank: 1 | 2 | 3;
  }) => {
    if (!player) return <Box sx={{ flex: 1, height: heights[rank] }} />;

    let barColor = theme.palette.grey[300];
    let iconColor = theme.palette.grey[500];

    if (player.color) {
      barColor = player.color;
      iconColor = "#fff";
    } else {
      if (rank === 1) {
        barColor = "#ffd700";
        iconColor = "#fff";
      }
      if (rank === 2) {
        barColor = "#c0c0c0";
        iconColor = "#fff";
      }
      if (rank === 3) {
        barColor = "#cd7f32";
        iconColor = "#fff";
      }
    }

    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          alignItems: "center",
          flex: 1,
          zIndex: rank === 1 ? 2 : 1,
        }}
      >
        <motion.div
          initial={hasAnimated ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: hasAnimated ? 0 : 0.3, duration: 0.5 }}
          style={{ textAlign: "center", marginBottom: 8 }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: "bold",
              lineHeight: 1.2,
              fontSize: { xs: "0.9rem", sm: "1.1rem" },
            }}
          >
            {player.name}
          </Typography>
          <Chip
            label={player.totalScore.toLocaleString()}
            size="small"
            sx={{ mt: 0.5, fontWeight: "bold", bgcolor: "white", boxShadow: 1 }}
          />
        </motion.div>

        <motion.div
          initial={hasAnimated ? { height: heights[rank] } : { height: 0 }}
          animate={{ height: heights[rank] }}
          transition={{
            type: "spring",
            stiffness: 100,
            damping: 20,
            delay: hasAnimated ? 0 : 0.1 * rank,
          }}
          style={{
            width: "100%",
            backgroundColor: barColor,
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: 12,
            boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
            position: "relative",
          }}
        >
          <Box
            sx={{
              color: iconColor,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {rank === 1 ? (
              <EmojiEventsIcon fontSize="large" />
            ) : (
              <Typography variant="h4" sx={{ fontWeight: "900", opacity: 0.7 }}>
                {rank}
              </Typography>
            )}
          </Box>
        </motion.div>
      </Box>
    );
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        height: 320,
        gap: { xs: 1, sm: 2 },
        maxWidth: 600,
        mx: "auto",
        mb: 4,
      }}
    >
      <PodiumStep player={second} rank={2} />
      <PodiumStep player={first} rank={1} />
      <PodiumStep player={third} rank={3} />
    </Box>
  );
};
