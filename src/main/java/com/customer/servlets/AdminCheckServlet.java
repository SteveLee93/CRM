package com.customer.servlets;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import org.json.JSONObject;

@WebServlet("/api/check-admin")
public class AdminCheckServlet extends HttpServlet {
  @Override
  protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    resp.setContentType("application/json");
    resp.setCharacterEncoding("UTF-8");
    
    HttpSession session = req.getSession(false);
    JSONObject response = new JSONObject();
    
    if (session != null) {
        Boolean isAdmin = (Boolean) session.getAttribute("isAdmin");
        response.put("isAdmin", isAdmin != null && isAdmin);
        System.out.println("AdminCheck - Session exists, isAdmin: " + isAdmin);
    } else {
        response.put("isAdmin", false);
        System.out.println("AdminCheck - No session found");
    }
    
    resp.getWriter().write(response.toString());
  }
}