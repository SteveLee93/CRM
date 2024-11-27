package com.customer.servlets;

import com.customer.database.DatabaseManager;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.sql.SQLException;
import org.json.JSONObject;
import java.util.logging.Logger;

@WebServlet("/api/check-email")
public class CheckEmailServlet extends HttpServlet {
    private static final Logger LOGGER = Logger.getLogger(CheckEmailServlet.class.getName());
    
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String email = req.getParameter("email");
        LOGGER.info("Received email check request for: " + email);
        //
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");
        
        JSONObject response = new JSONObject();
        
        try {
            boolean isAvailable = DatabaseManager.getInstance().isEmailAvailable(email);
            response.put("available", isAvailable);
            LOGGER.info("Email check result - email: " + email + ", available: " + isAvailable);
            System.out.println("Sending response: " + response.toString());
        } catch (SQLException e) {
            LOGGER.severe("Database error while checking email: " + e.getMessage());
            e.printStackTrace();
            response.put("available", false);
            response.put("error", "데이터베이스 오류가 발생했습니다.");
        }
        
        resp.getWriter().write(response.toString());
        LOGGER.info("Sent response: " + response.toString());
    }
} 