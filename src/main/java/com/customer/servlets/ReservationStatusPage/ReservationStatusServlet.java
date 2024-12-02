package com.customer.servlets.ReservationStatusPage;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.io.InputStream;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import org.json.JSONObject;
import org.json.JSONArray;
import com.customer.database.DatabaseManager;

@WebServlet(urlPatterns = { "/reservationStatus", "/api/reservations" })
public class ReservationStatusServlet extends HttpServlet {
  @Override
  protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    HttpSession session = req.getSession(false);
    if (session == null || session.getAttribute("username") == null) {
      resp.sendRedirect("/login");
      return;
    }

    String pathInfo = req.getServletPath();

    if (pathInfo.startsWith("/static/")) {
      handleStaticResource(req, resp);
      return;
    }

    if ("/reservationStatus".equals(pathInfo)) {
      handlePageRequest(resp);
    } else if ("/api/reservations".equals(pathInfo)) {
      handleApiRequest(resp);
    }
  }

  private void handleApiRequest(HttpServletResponse resp) throws IOException {
    try {
      DatabaseManager db = DatabaseManager.getInstance();
      JSONArray reservations = db.getReservations();

      // 여기서 데이터 가공/필터링 가능

      resp.setContentType("application/json");
      resp.setCharacterEncoding("UTF-8");
      resp.getWriter().write(reservations.toString());
    } catch (SQLException e) {
      handleError(resp, e);
    }
  }

  private void handlePageRequest(HttpServletResponse resp) throws IOException {
    resp.setContentType("text/html; charset=UTF-8");
    try (InputStream in = getClass().getClassLoader()
        .getResourceAsStream("html/reservationStatus.html")) {
      if (in != null) {
        try (BufferedReader reader = new BufferedReader(
            new InputStreamReader(in, StandardCharsets.UTF_8))) {
          String line;
          while ((line = reader.readLine()) != null) {
            resp.getWriter().println(line);
          }
        }
      }
    }
  }

  private void handleError(HttpServletResponse resp, SQLException e) throws IOException {
    resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
    JSONObject error = new JSONObject();
    error.put("error", e.getMessage());
    resp.setContentType("application/json");
    resp.setCharacterEncoding("UTF-8");
    resp.getWriter().write(error.toString());
  }

  private void handleStaticResource(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    String fileName = req.getServletPath();
    try (InputStream in = getClass().getClassLoader().getResourceAsStream(fileName.substring(1))) {
      if (in != null) {
        if (fileName.endsWith(".css")) {
          resp.setContentType("text/css");
        } else if (fileName.endsWith(".js")) {
          resp.setContentType("application/javascript");
        }
        resp.setCharacterEncoding("UTF-8");
        byte[] buffer = new byte[1024];
        int bytesRead;
        while ((bytesRead = in.read(buffer)) != -1) {
          resp.getOutputStream().write(buffer, 0, bytesRead);
        }
      } else {
        resp.sendError(HttpServletResponse.SC_NOT_FOUND);
      }
    }
  }
}