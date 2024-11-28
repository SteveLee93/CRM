package com.customer.servlets;

import com.customer.database.DatabaseManager;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.sql.SQLException;
import java.util.logging.Logger;

@WebServlet(urlPatterns = { "/customer-management", "/api/customer", "/api/customer/*", "/api/check-username",
    "/api/check-email", "/static/*" })
public class CustomerManagementServlet extends HttpServlet {
  private static final Logger LOGGER = Logger.getLogger(CustomerManagementServlet.class.getName());

  @Override
  protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    String pathInfo = req.getServletPath();

    // static 리소스 요청 처리
    if (pathInfo.startsWith("/static/")) {
      handleStaticResource(req, resp);
      return;
    }

    // 세션 체크
    HttpSession session = req.getSession(false);
    if (session == null || session.getAttribute("username") == null) {
      resp.sendRedirect("/login");
      return;
    }

    String searchType = req.getParameter("type");
    String searchTerm = req.getParameter("term");

    LOGGER.info("Received GET request - Path: " + pathInfo +
        ", Type: " + searchType +
        ", Term: " + searchTerm);

    if ("/customer-management".equals(pathInfo)) {
      handlePageRequest(resp);
    } else if ("/api/customer".equals(pathInfo)) {
      handleApiRequest(req, resp);
    }
  }

  private void handlePageRequest(HttpServletResponse resp) throws IOException {
    resp.setContentType("text/html;charset=UTF-8");
    try (InputStream is = getClass().getClassLoader().getResourceAsStream("html/customerManagement.html");
        BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
      String line;
      while ((line = reader.readLine()) != null) {
        resp.getWriter().println(line);
      }
    }
  }

  private void handleApiRequest(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    String searchType = req.getParameter("type");
    String searchTerm = req.getParameter("term");

    resp.setContentType("application/json");
    resp.setCharacterEncoding("UTF-8");

    try {
      if (searchTerm != null && !searchTerm.trim().isEmpty()) {
        // 검색 실행
        JSONArray results = DatabaseManager.getInstance().searchCustomers(searchType, searchTerm.trim());
        LOGGER.info("Search results found: " + results.length());
        resp.getWriter().write(results.toString());
      } else {
        // 전체 목록 반환
        JSONArray customers = DatabaseManager.getInstance().getCustomers();
        LOGGER.info("Total customers found: " + customers.length());
        resp.getWriter().write(customers.toString());
      }
    } catch (SQLException e) {
      LOGGER.severe("Database error: " + e.getMessage());
      handleError(resp, e);
    }
  }

  @Override
  protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    HttpSession session = req.getSession(false);
    if (session == null || session.getAttribute("username") == null) {
      resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
      return;
    }

    String pathInfo = req.getServletPath();
    LOGGER.info("Received POST request to: " + pathInfo);

    if ("/api/customer".equals(pathInfo)) {
      handleAddCustomer(req, resp);
    } else if ("/api/customer".equals(pathInfo)) {
      handleUpdateCustomer(req, resp);
    }
  }

  private void handleAddCustomer(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    req.setCharacterEncoding("UTF-8");
    resp.setCharacterEncoding("UTF-8");

    StringBuilder sb = new StringBuilder();
    try (BufferedReader reader = new BufferedReader(
        new InputStreamReader(req.getInputStream(), StandardCharsets.UTF_8))) {
      String line;
      while ((line = reader.readLine()) != null) {
        sb.append(line);
      }
    }

    try {
      JSONObject customerData = new JSONObject(sb.toString());
      LOGGER.info("Received customer data: " + customerData.toString());

      String email = customerData.getString("email");
      if (!isValidEmail(email)) {
        JSONObject response = new JSONObject();
        response.put("success", false);
        response.put("error", "올바른 이메일 형식이 아닙니다.");
        resp.setContentType("application/json");
        resp.getWriter().write(response.toString());
        return;
      }

      boolean success = DatabaseManager.getInstance().addCustomer(customerData);

      JSONObject response = new JSONObject();
      response.put("success", success);

      resp.setContentType("application/json");
      resp.getWriter().write(response.toString());
    } catch (SQLException e) {
      LOGGER.severe("SQL Error in handleAddCustomer: " + e.getMessage());
      handleError(resp, e);
    } catch (Exception e) {
      LOGGER.severe("Unexpected error in handleAddCustomer: " + e.getMessage());
      handleError(resp, e);
    }
  }

  private boolean isValidEmail(String email) {
    String emailRegex = "^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,6}$";
    return email != null && email.matches(emailRegex);
  }

  private void handleUpdateCustomer(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    StringBuilder sb = new StringBuilder();
    try (BufferedReader reader = req.getReader()) {
      String line;
      while ((line = reader.readLine()) != null) {
        sb.append(line);
      }
    }

    JSONObject customerData = new JSONObject(sb.toString());
    resp.setContentType("application/json");
    resp.setCharacterEncoding("UTF-8");

    try {
      boolean success = DatabaseManager.getInstance().updateCustomer(customerData);
      JSONObject response = new JSONObject();
      response.put("success", success);
      resp.getWriter().write(response.toString());
    } catch (SQLException e) {
      handleError(resp, e);
    }
  }

  @Override
  protected void doDelete(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    HttpSession session = req.getSession(false);
    if (session == null || session.getAttribute("username") == null) {
      resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
      return;
    }

    String pathInfo = req.getPathInfo();
    LOGGER.info("Received DELETE request with pathInfo: " + pathInfo);

    if (pathInfo != null && pathInfo.length() > 1) {
      try {
        int userId = Integer.parseInt(pathInfo.substring(1));
        boolean success = DatabaseManager.getInstance().deleteCustomer(userId);

        JSONObject response = new JSONObject();
        response.put("success", success);

        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");
        resp.getWriter().write(response.toString());
      } catch (SQLException e) {
        handleError(resp, e);
      }
    }
  }

  @Override
  protected void doPut(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    // 인코딩 설정 추가
    req.setCharacterEncoding("UTF-8");
    resp.setCharacterEncoding("UTF-8");

    HttpSession session = req.getSession(false);
    if (session == null || session.getAttribute("username") == null) {
      resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
      return;
    }

    String pathInfo = req.getPathInfo();
    LOGGER.info("Received PUT request with pathInfo: " + pathInfo);

    if (pathInfo != null && pathInfo.length() > 1) {
      try {
        StringBuilder sb = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(
            new InputStreamReader(req.getInputStream(), StandardCharsets.UTF_8))) {
          String line;
          while ((line = reader.readLine()) != null) {
            sb.append(line);
          }
        }

        // ID 파싱
        int userId = Integer.parseInt(pathInfo.substring(1));
        JSONObject customerData = new JSONObject(sb.toString());
        customerData.put("id", userId);

        // 고객 정보 업데이트
        boolean success = DatabaseManager.getInstance().updateCustomer(customerData);

        // 응답 생성
        JSONObject response = new JSONObject();
        response.put("success", success);

        resp.setContentType("application/json");
        resp.getWriter().write(response.toString());
      } catch (SQLException e) {
        handleError(resp, e);
      }
    } else {
      resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
    }
  }

  private void handleError(HttpServletResponse resp, Exception e) throws IOException {
    resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
    resp.setContentType("application/json");
    resp.setCharacterEncoding("UTF-8");

    JSONObject error = new JSONObject();
    error.put("error", e.getMessage());
    resp.getWriter().write(error.toString());

    LOGGER.severe("Error handled: " + e.getMessage());
  }

  // static 리소스 처리 메서드 추가
  private void handleStaticResource(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    String fileName = req.getServletPath();
    try (InputStream inputStream = getClass().getClassLoader().getResourceAsStream(fileName.substring(1))) {
      if (inputStream != null) {
        // Content-Type 설정
        if (fileName.endsWith(".css")) {
          resp.setContentType("text/css");
        } else if (fileName.endsWith(".js")) {
          resp.setContentType("application/javascript");
        }
        resp.setCharacterEncoding("UTF-8");

        // 파일 내용 전송
        byte[] buffer = new byte[1024];
        int bytesRead;
        while ((bytesRead = inputStream.read(buffer)) != -1) {
          resp.getOutputStream().write(buffer, 0, bytesRead);
        }
      } else {
        resp.sendError(HttpServletResponse.SC_NOT_FOUND);
      }
    }
  }
}