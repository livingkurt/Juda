"use client";

import { AppBar, Toolbar, Button, Box } from "@mui/material";
import { useRouter, usePathname } from "next/navigation";

const Navigation = () => {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { label: "Habits", path: "/" },
    { label: "Calendar", path: "/calendar" },
    { label: "Stats", path: "/stats" },
  ];

  return (
    <AppBar position="static" elevation={0}>
      <Toolbar>
        <Box sx={{ display: "flex", gap: 2 }}>
          {navItems.map(item => (
            <Button
              key={item.path}
              onClick={() => router.push(item.path)}
              sx={{
                color:
                  pathname === item.path ? "secondary.main" : "primary.main",
                fontWeight: pathname === item.path ? "bold" : "normal",
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
