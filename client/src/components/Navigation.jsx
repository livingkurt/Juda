import { AppBar, Toolbar, Button, Box } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: "Tasks", path: "/" },
    { label: "Table", path: "/table" },
    { label: "Calendar", path: "/calendar" },
  ];

  return (
    <AppBar position="static" elevation={0}>
      <Toolbar>
        <Box sx={{ display: "flex", gap: 2 }}>
          {navItems.map(item => (
            <Button
              key={item.path}
              onClick={() => navigate(item.path)}
              sx={{
                color:
                  location.pathname === item.path
                    ? "secondary.main"
                    : "primary.main",
                fontWeight: location.pathname === item.path ? "bold" : "normal",
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navigation;
