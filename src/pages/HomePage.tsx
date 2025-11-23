import React from "react";
import type { FC } from "react";
import {
  Box,
  Typography,
  Button,
  Container,
  Paper,
  Grid,
  useTheme,
} from "@mui/material";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome"; // Sparkles
import MapIcon from "@mui/icons-material/Map";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

export const HomePage: FC = () => {
  const theme = useTheme();

  const scrollToLore = () => {
    const loreSection = document.getElementById("lore-section");
    if (loreSection) {
      const elementRect = loreSection.getBoundingClientRect();
      const absoluteElementTop = elementRect.top + window.pageYOffset;
      const middle =
        absoluteElementTop - window.innerHeight / 2 + elementRect.height / 2;

      // Custom smooth scroll with longer duration
      const startPosition = window.pageYOffset;
      const distance = middle - startPosition;
      const duration = 1000;
      let startTime = 0;

      const easeInOutCubic = (t: number) => {
        return t < 0.5
          ? 4 * t * t * t
          : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
      };

      const animation = (currentTime: number) => {
        if (startTime === 0) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / duration, 1);

        const easedProgress = easeInOutCubic(progress);
        const currentPosition = startPosition + distance * easedProgress;

        window.scrollTo(0, currentPosition);

        if (progress < 1) {
          requestAnimationFrame(animation);
        }
      };

      requestAnimationFrame(animation);
    }
  };

  return (
    <Box sx={{ overflowX: "hidden" }}>
      {/* --- SECTION 1: THE HERO (Dark & Magical) --- */}
      <Box
        sx={{
          minHeight: "85vh",
          background: `linear-gradient(160deg, ${theme.palette.secondary.main} 0%, #2d1e12 100%)`,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          position: "relative",
          px: 3,
        }}
      >
        {/* Decorative glowing orbs (CSS gradients) */}
        <Box
          sx={{
            position: "absolute",
            top: "20%",
            left: "10%",
            width: 200,
            height: 200,
            background:
              "radial-gradient(circle, rgba(238,196,92,0.2) 0%, rgba(0,0,0,0) 70%)",
            pointerEvents: "none",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: "10%",
            right: "5%",
            width: 300,
            height: 300,
            background:
              "radial-gradient(circle, rgba(185,117,57,0.15) 0%, rgba(0,0,0,0) 70%)",
            pointerEvents: "none",
          }}
        />

        <Container maxWidth="md">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ staggerChildren: 0.3 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <AutoAwesomeIcon
                sx={{
                  fontSize: 60,
                  color: theme.palette.warning.main,
                  mb: 2,
                  filter: "drop-shadow(0 0 10px rgba(238,196,92,0.8))",
                }}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
            >
              <Typography
                variant="h2"
                component="h1"
                sx={{
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  mb: 1,
                  background: `linear-gradient(45deg, #ffffff 30%, ${theme.palette.warning.main} 90%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  textShadow: "0 10px 30px rgba(0,0,0,0.3)",
                }}
              >
                LUMOS
              </Typography>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.6 }}
            >
              <Typography
                variant="h5"
                color="rgba(255, 255, 255, 0.75)"
                sx={{
                  mb: 6,
                  opacity: 0.9,
                  fontWeight: 300,
                  maxWidth: 600,
                  mx: "auto",
                }}
              >
                Orientation 2026
              </Typography>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.9 }}
            >
              <Button
                variant="contained"
                size="large"
                color="warning"
                endIcon={<ArrowForwardIcon />}
                onClick={scrollToLore}
                sx={{
                  py: 2,
                  px: 6,
                  fontSize: "1.2rem",
                  borderRadius: 50,
                  boxShadow: "0 0 20px rgba(238,196,92,0.4)",
                }}
              >
                Enter The Realm
              </Button>
            </motion.div>
          </motion.div>
        </Container>
      </Box>

      {/* --- SECTION 2: THE LORE (Scroll / Story) --- */}
      <Box
        id="lore-section"
        sx={{ py: 10, px: 2, background: theme.palette.background.default }}
      >
        <Container maxWidth="md">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <Paper
              elevation={0}
              sx={{
                p: { xs: 4, md: 8 },
                textAlign: "center",
                background: "#fff",
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 4,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* decorative corner */}
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: 4,
                  background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.warning.main})`,
                }}
              />

              <Typography
                variant="overline"
                color="primary"
                sx={{
                  letterSpacing: 3,
                  fontWeight: "bold",
                  mb: 2,
                  display: "block",
                }}
              >
                The Prophecy
              </Typography>

              <Typography
                variant="h4"
                gutterBottom
                sx={{
                  color: theme.palette.secondary.main,
                  mb: 4,
                  fontWeight: "bold",
                }}
              >
                Awakening the Birdhouses
              </Typography>

              <Typography
                variant="body1"
                paragraph
                sx={{
                  fontSize: "1.1rem",
                  lineHeight: 1.8,
                  color: "text.secondary",
                }}
              >
                A surge of magic has swept across the city, awakening the four
                ancient birdhouses, each tied to the power of light, flight, and
                mythical birds.
              </Typography>
              <Typography
                variant="body1"
                paragraph
                sx={{
                  fontSize: "1.1rem",
                  lineHeight: 1.8,
                  color: "text.secondary",
                }}
              >
                The magic scattered across Singapore, turning everyday locations
                into enchanted challenge sites. As new initiates, your team must
                travel from station to station, completing tasks to gather Lumos
                points and restore balance.
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  fontSize: "1.2rem",
                  lineHeight: 1.8,
                  color: theme.palette.primary.main,
                  fontWeight: "bold",
                  mt: 4,
                }}
              >
                "The team with the highest points will rise as the true
                champions."
              </Typography>
            </Paper>
          </motion.div>
        </Container>
      </Box>

      {/* --- SECTION 3: GAMEPLAY LOOP (Cards) --- */}
      <Box sx={{ py: 10, bgcolor: "#f4eee6" }}>
        <Container maxWidth="lg">
          <Typography
            variant="h4"
            align="center"
            sx={{
              mb: 6,
              fontWeight: "bold",
              color: theme.palette.secondary.main,
            }}
          >
            Your Journey Begins
          </Typography>

          <Grid container spacing={4}>
            {[
              {
                icon: <MapIcon fontSize="large" />,
                title: "Travel",
                desc: "Navigate to enchanted stations across the island.",
              },
              {
                icon: <AutoAwesomeIcon fontSize="large" />,
                title: "Conquer",
                desc: "Complete challenges to earn points.",
              },
              {
                icon: <EmojiEventsIcon fontSize="large" />,
                title: "Ascend",
                desc: "Climb the live leaderboard and claim victory.",
              },
            ].map((item, i) => (
              <Grid size={{ xs: 12, md: 4 }} key={i}>
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2, duration: 0.6 }}
                >
                  <Paper
                    sx={{
                      p: 4,
                      textAlign: "center",
                      height: "100%",
                      borderRadius: 4,
                      transition: "transform 0.3s",
                      "&:hover": { transform: "translateY(-8px)" },
                    }}
                  >
                    <Box
                      sx={{
                        width: 70,
                        height: 70,
                        mx: "auto",
                        mb: 3,
                        borderRadius: "50%",
                        bgcolor: "#fff8e1",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: theme.palette.primary.main,
                      }}
                    >
                      {item.icon}
                    </Box>
                    <Typography
                      variant="h5"
                      gutterBottom
                      sx={{ fontWeight: "bold" }}
                    >
                      {item.title}
                    </Typography>
                    <Typography color="text.secondary">{item.desc}</Typography>
                  </Paper>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* --- SECTION 4: RESOURCES --- */}
      <Box sx={{ py: 8, textAlign: "center" }}>
        <Container maxWidth="sm">
          <Typography variant="h5" gutterBottom sx={{ fontWeight: "bold" }}>
            Adventurer's Toolkit
          </Typography>
          <Box
            sx={{
              mt: 3,
              display: "flex",
              gap: 2,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Button
              variant="outlined"
              color="primary"
              href="/mrt-map.pdf"
              target="_blank"
            >
              Annotated MRT Map
            </Button>
            <Button
              component={Link}
              to="/leaderboard"
              variant="outlined"
              color="secondary"
            >
              Live Leaderboard
            </Button>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};
