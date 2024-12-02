package com.customer.servlets;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.io.BufferedReader;
import java.sql.SQLException;

import org.json.JSONArray;
import org.json.JSONObject;
import com.customer.database.DatabaseManager;

@WebServlet(urlPatterns = { "/room-management", "/api/room", "/api/room/*", "/static/*" })
public class RoomManagementServlet extends HttpServlet {

  @Override
  protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    String pathInfo = req.getServletPath();

    if (pathInfo.startsWith("/static/")) {
      handleStaticResource(req, resp);
      return;
    }

    if ("/room-management".equals(pathInfo)) {
      handlePageRequest(resp);
    } else {
      handleApiRequest(resp);
    }
  }

  private void handlePageRequest(HttpServletResponse resp) throws IOException {
    resp.setContentType("text/html;charset=UTF-8");
    try (BufferedReader reader = new BufferedReader(
        new InputStreamReader(
            getClass().getClassLoader().getResourceAsStream("html/roomManagement.html"),
            StandardCharsets.UTF_8))) {
      String line;
      while ((line = reader.readLine()) != null) {
        resp.getWriter().println(line);
      }
    }
  }

  private void handleApiRequest(HttpServletResponse resp) throws IOException {
    resp.setContentType("application/json");
    resp.setCharacterEncoding("UTF-8");

    try {
      DatabaseManager db = DatabaseManager.getInstance();
      JSONArray rooms = db.getAllRooms();
      resp.getWriter().write(rooms.toString());
    } catch (SQLException e) {
      handleError(resp, e);
    }
  }

  private void handleStaticResource(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    String fileName = req.getServletPath();
    try (InputStream inputStream = getClass().getClassLoader().getResourceAsStream(fileName.substring(1))) {
      if (inputStream != null) {
        if (fileName.endsWith(".css")) {
          resp.setContentType("text/css");
        } else if (fileName.endsWith(".js")) {
          resp.setContentType("application/javascript");
        }
        resp.setCharacterEncoding("UTF-8");

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

  @Override
  protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    resp.setContentType("application/json");
    resp.setCharacterEncoding("UTF-8");

    try {
      StringBuilder buffer = new StringBuilder();
      try (BufferedReader reader = req.getReader()) {
        String line;
        while ((line = reader.readLine()) != null) {
          buffer.append(line);
        }
      }

      JSONObject jsonRequest = new JSONObject(buffer.toString());
      System.out.println("Received data: " + jsonRequest.toString());

      String roomNumber = jsonRequest.getString("roomNumber");
      String roomType = jsonRequest.getString("roomType");
      String status = jsonRequest.getString("status");

      DatabaseManager db = DatabaseManager.getInstance();

      if (db.roomExists(roomNumber)) {
        JSONObject response = new JSONObject();
        response.put("success", false);
        response.put("message", "이미 존재하는 객실 번호입니다.");
        resp.getWriter().write(response.toString());
        return;
      }

      boolean success = db.addRoom(roomNumber, roomType, status);

      JSONObject response = new JSONObject();
      response.put("success", success);
      response.put("message", success ? "객실이 추가되었습니다." : "객실 추가에 실패했습니다.");
      resp.getWriter().write(response.toString());

    } catch (Exception e) {
      System.err.println("Error in doPost: " + e.getMessage());
      e.printStackTrace();
      JSONObject error = new JSONObject();
      error.put("success", false);
      error.put("message", "오류가 발생했습니다: " + e.getMessage());
      resp.getWriter().write(error.toString());
    }
  }

  @Override
  protected void doPut(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    resp.setContentType("application/json");
    resp.setCharacterEncoding("UTF-8");

    try {
      StringBuilder buffer = new StringBuilder();
      try (BufferedReader reader = req.getReader()) {
        String line;
        while ((line = reader.readLine()) != null) {
          buffer.append(line);
        }
      }

      JSONObject jsonRequest = new JSONObject(buffer.toString());
      String roomNumber = req.getPathInfo().substring(1); // /1234 -> 1234
      String roomType = jsonRequest.getString("roomType");
      String status = jsonRequest.getString("status");

      DatabaseManager db = DatabaseManager.getInstance();
      boolean success = db.updateRoom(roomNumber, roomType, status);

      JSONObject response = new JSONObject();
      response.put("success", success);
      response.put("message", success ? "객실 정보가 업데이트되었습니다." : "객실 정보 업데이트에 실패했습니다.");
      resp.getWriter().write(response.toString());

    } catch (Exception e) {
      System.err.println("Error in doPut: " + e.getMessage());
      e.printStackTrace();

      JSONObject errorResponse = new JSONObject();
      errorResponse.put("success", false);
      errorResponse.put("message", "서버 오류: " + e.getMessage());

      resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
      resp.getWriter().write(errorResponse.toString());
    }
  }

  @Override
  protected void doDelete(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    resp.setContentType("application/json");
    resp.setCharacterEncoding("UTF-8");

    try {
      String pathInfo = req.getPathInfo();
      String roomNumber = pathInfo != null ? pathInfo.substring(1) : null;

      if (roomNumber == null || roomNumber.isEmpty()) {
        throw new IllegalArgumentException("객실 번호가 필요합니다.");
      }

      System.out.println("Deleting room: " + roomNumber);

      DatabaseManager db = DatabaseManager.getInstance();
      boolean success = db.deleteRoom(roomNumber);

      JSONObject response = new JSONObject();
      response.put("success", success);
      response.put("message", success ? "객실이 삭제되었습니다." : "객실을 찾을 수 없습니다.");
      resp.getWriter().write(response.toString());

    } catch (Exception e) {
      System.err.println("Error in doDelete: " + e.getMessage());
      e.printStackTrace();
      JSONObject error = new JSONObject();
      error.put("success", false);
      error.put("message", "오류가 발생했습니다: " + e.getMessage());
      resp.getWriter().write(error.toString());
    }
  }

  private void handleError(HttpServletResponse resp, Exception e) throws IOException {
    resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
    JSONObject error = new JSONObject();
    error.put("success", false);
    error.put("message", e.getMessage());
    resp.getWriter().write(error.toString());
  }
}