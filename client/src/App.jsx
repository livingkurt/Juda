import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline, Box } from "@mui/material";
import { theme } from "./theme/theme";
import TasksView from "./components/TasksView";
import TableView from "./components/TableView";
import CalendarView from "./components/CalendarView";
import Navigation from "./components/Navigation";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
      >
        <Router>
          <Navigation />
          <Routes>
            <Route path="/" element={<TasksView />} />
            <Route path="/table" element={<TableView />} />
            <Route path="/calendar" element={<CalendarView />} />
          </Routes>
        </Router>
      </Box>
    </ThemeProvider>
  );
}

export default App;
