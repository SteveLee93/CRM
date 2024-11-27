package com.customer.servlets;

import com.customer.database.DatabaseManager;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.sql.SQLException;
import java.util.logging.Logger;
import java.util.logging.Level;

@WebServlet("/api/check-username")
public class CheckUsernameServlet extends HttpServlet {
    private static final Logger LOGGER = Logger.getLogger(CheckUsernameServlet.class.getName());

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");
        
        String username = req.getParameter("username");
        LOGGER.info("Checking username: " + username);

        if (username == null || username.trim().isEmpty()) {
            LOGGER.warning("Username parameter is null or empty");
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            resp.getWriter().write("{\"error\": \"Username is required\"}");
            return;
        }

        try {
            boolean exists = DatabaseManager.getInstance().checkUsernameExists(username);
            LOGGER.info("Username '" + username + "' exists: " + exists);
            String jsonResponse = "{\"available\": " + !exists + "}";
            LOGGER.info("Sending response: " + jsonResponse);
            resp.getWriter().write(jsonResponse);
        } catch (SQLException e) {
            LOGGER.log(Level.SEVERE, "Database error while checking username", e);
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write("{\"error\": \"Database error: " + e.getMessage() + "\"}");
        }
    }
} 