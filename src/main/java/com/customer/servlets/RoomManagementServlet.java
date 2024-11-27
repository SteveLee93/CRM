package com.customer.servlets;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.io.BufferedReader;
import java.sql.SQLException;

import org.json.JSONArray;
import org.json.JSONObject;
import com.customer.database.DatabaseManager;

@WebServlet(urlPatterns = { "/room-management", "/api/room", "/api/room/*" })
public class RoomManagementServlet extends HttpServlet {

  @Override
  protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    String pathInfo = req.getServletPath();

    if ("/room-management".equals(pathInfo)) {
      // HTML 페이지 반환
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
    } else {
      // API 요청 처리
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
  }

  @Override
  protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    resp.setContentType("application/json");
    resp.setCharacterEncoding("UTF-8");

    try {
      // 요청 데이터 읽기
      StringBuilder buffer = new StringBuilder();
      try (BufferedReader reader = req.getReader()) {
        String line;
        while ((line = reader.readLine()) != null) {
          buffer.append(line);
        }
      }

      JSONObject jsonRequest = new JSONObject(buffer.toString());
      System.out.println("Received data: " + jsonRequest.toString()); // 디버깅용

      String roomNumber = jsonRequest.getString("roomNumber");
      String roomType = jsonRequest.getString("roomType");
      String status = jsonRequest.getString("status");

      DatabaseManager db = DatabaseManager.getInstance();

      // 중복 체크
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
        // 요청 데이터 읽기
        StringBuilder buffer = new StringBuilder();
        try (BufferedReader reader = req.getReader()) {
            String line;
            while ((line = reader.readLine()) != null) {
                buffer.append(line);
            }
        }
        
        JSONObject jsonRequest = new JSONObject(buffer.toString());
        System.out.println("Received update data: " + jsonRequest.toString()); // 디버깅용
        
        String roomNumber = jsonRequest.getString("roomNumber");
        String roomType = jsonRequest.getString("roomType");
        String status = jsonRequest.getString("status");
        
        DatabaseManager db = DatabaseManager.getInstance();
        boolean success = db.updateRoom(roomNumber, roomType, status);
        
        JSONObject response = new JSONObject();
        response.put("success", success);
        response.put("message", success ? "객실이 수정되었습니다." : "객실 수정에 실패했습니다.");
        resp.getWriter().write(response.toString());
        
    } catch (Exception e) {
        System.err.println("Error in doPut: " + e.getMessage());
        e.printStackTrace();
        JSONObject error = new JSONObject();
        error.put("success", false);
        error.put("message", "오류가 발생했습니다: " + e.getMessage());
        resp.getWriter().write(error.toString());
    }
  }

  @Override
  protected void doDelete(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    resp.setContentType("application/json");
    resp.setCharacterEncoding("UTF-8");
    
    try {
        // URL에서 객실 번호 추출 (/api/room/123 -> 123)
        String pathInfo = req.getPathInfo();
        String roomNumber = pathInfo != null ? pathInfo.substring(1) : null;
        
        if (roomNumber == null || roomNumber.isEmpty()) {
            throw new IllegalArgumentException("객실 번호가 필요합니다.");
        }

        System.out.println("Deleting room: " + roomNumber); // 디버깅용
        
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