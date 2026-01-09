import { useState, useEffect } from "react";
import type { FC } from "react";
import {
  Box,
  Typography,
  Button,
  Container,
  Paper,
  Grid,
  useTheme,
  Alert,
  Pagination,
  Stack,
} from "@mui/material";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome"; // Sparkles
import MapIcon from "@mui/icons-material/Map";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CampaignIcon from "@mui/icons-material/Campaign";
import {
  collection,
  query,
  where,
  // orderBy, // Removed to prevent index errors
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";

export const HomePage: FC = () => {
  const theme = useTheme();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    // Fetch ALL guest announcements without server-side ordering to prevent index bugs
    const q = query(
      collection(db, "announcements"),
      where("targets", "array-contains", "GUEST")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as any[];

      // Sort client-side (Newest first)
      docs.sort((a, b) => {
        const timeA = a.timestamp?.toMillis() || 0;
        const timeB = b.timestamp?.toMillis() || 0;
        return timeB - timeA;
      });

      setAnnouncements(docs);
    });
    return () => unsubscribe();
  }, []);

  const handlePageChange = (
    _event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setPage(value);
  };

  const pageCount = Math.ceil(announcements.length / ITEMS_PER_PAGE);
  const displayedAnnouncements = announcements.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const scrollToLore = () => {
    const loreSection = document.getElementById("lore-section");
    if (loreSection) {
      const elementRect = loreSection.getBoundingClientRect();
      const absoluteElementTop = elementRect.top + window.pageYOffset;

      // On mobile (< 768px), scroll to top; on desktop, scroll to center
      const isMobile = window.innerWidth < 768;
      const middle = isMobile
        ? absoluteElementTop
        : absoluteElementTop - window.innerHeight / 2 + elementRect.height / 2;

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
              <Box
                component="img"
                src="/logo.png"
                alt="Logo"
                sx={{
                  width: 150,
                  height: "auto",
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
                desc: "Complete challenges to earn points and win against others.",
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

      {/* --- SECTION 3.5: GUEST ANNOUNCEMENTS (MOVED HERE) --- */}
      <Box sx={{ py: 8, bgcolor: "#fff8e1" }}>
        <Container maxWidth="md">
          <Typography
            variant="h4"
            align="center"
            gutterBottom
            sx={{
              mb: 4,
              fontWeight: "bold",
              color: theme.palette.warning.dark,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
            }}
          >
            <CampaignIcon fontSize="large" /> Latest Updates
          </Typography>

          {announcements.length === 0 ? (
            <Typography
              align="center"
              color="text.secondary"
              sx={{ fontStyle: "italic", mt: 2 }}
            >
              No announcements yet.
            </Typography>
          ) : (
            <>
              <Stack spacing={2}>
                {displayedAnnouncements.map((ann) => (
                  <motion.div
                    key={ann.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                  >
                    <Alert
                      severity="info"
                      icon={<CampaignIcon fontSize="inherit" />}
                      sx={{
                        "& .MuiAlert-message": { width: "100%" },
                        boxShadow: 1,
                        bgcolor: "#ffffff",
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: "bold",
                          color: theme.palette.warning.dark,
                        }}
                      >
                        {ann.timestamp?.toDate().toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Typography>
                      <Typography variant="body1">{ann.message}</Typography>
                    </Alert>
                  </motion.div>
                ))}
              </Stack>

              {pageCount > 1 && (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                  <Pagination
                    count={pageCount}
                    page={page}
                    onChange={handlePageChange}
                    size="large"
                    sx={{
                      "& .MuiPaginationItem-root.Mui-selected": {
                        bgcolor: "warning.main",
                        color: "warning.contrastText",
                        "&:hover": {
                          bgcolor: "warning.dark",
                        },
                      },
                    }}
                  />
                </Box>
              )}
            </>
          )}
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
              component={Link}
              to="/mrt-map"
              variant="outlined"
              color="primary"
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
