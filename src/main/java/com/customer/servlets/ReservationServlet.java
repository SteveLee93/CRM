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
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

@WebServlet("api/reservation")
public class ReservationServlet extends HttpServlet {
  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response)
      throws IOException {
    response.setContentType("application/json");
    response.setCharacterEncoding("UTF-8");

    HttpSession session = request.getSession(false);
    if (session == null || session.getAttribute("username") == null) {
      response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
      return;
    }

    String username = (String) session.getAttribute("username");

    try (Connection conn = DatabaseManager.getInstance().getConnection()) {
      String sql = "SELECT * FROM reservation WHERE name = ?";
      PreparedStatement stmt = conn.prepareStatement(sql);
      stmt.setString(1, username);

      ResultSet rs = stmt.executeQuery();
      JSONArray reservations = new JSONArray();

      while (rs.next()) {
        JSONObject reservation = new JSONObject();
        reservation.put("roomNumber", rs.getString("roomNumber"));
        reservation.put("roomType", rs.getString("roomType"));
        reservation.put("checkinDt", rs.getString("checkinDt"));
        reservation.put("checkoutDt", rs.getString("checkoutDt"));
        reservation.put("reservationDt", rs.getString("reservationDt"));
        reservations.put(reservation);
      }

      response.getWriter().write(reservations.toString());
    } catch (SQLException e) {
      e.printStackTrace();
      response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
      JSONObject error = new JSONObject();
      error.put("error", "데이터베이스 오류가 발생했습니다.");
      response.getWriter().write(error.toString());
    }
  }

  @Override
  protected void doPost(HttpServletRequest request, HttpServletResponse response)
      throws IOException {

    BufferedReader reader = request.getReader();
    StringBuilder sb = new StringBuilder();
    String line;
    while ((line = reader.readLine()) != null) {
      sb.append(line);
    }

    // JSON 파싱
    JSONObject jsonObject = new JSONObject(sb.toString());

    try (Connection conn = DatabaseManager.getInstance().getConnection()) {
      String sql = "INSERT INTO reservation (name, room_number, room_type, checkin_dt, checkout_dt) VALUES (?, ?, ?, ?, ?)";

      PreparedStatement pstmt = conn.prepareStatement(sql);
      pstmt.setString(1, jsonObject.getString("name"));
      pstmt.setString(2, jsonObject.getString("roomNumber"));
      pstmt.setString(3, jsonObject.getString("roomType"));
      pstmt.setString(4, jsonObject.getString("checkinDt"));
      pstmt.setString(5, jsonObject.getString("checkoutDt"));

      int result = pstmt.executeUpdate();

      JSONObject jsonResponse = new JSONObject();
      if (result > 0) {
        jsonResponse.put("success", true);
        jsonResponse.put("message", "예약이 완료되었습니다.");
      } else {
        jsonResponse.put("success", false);
        jsonResponse.put("message", "예약 실패했습니다.");
      }

      response.setContentType("application/json");
      response.setCharacterEncoding("UTF-8");
      response.getWriter().write(jsonResponse.toString());

    } catch (SQLException e) {
      response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
      JSONObject errorResponse = new JSONObject();
      errorResponse.put("success", false);
      errorResponse.put("message", "데이터베이스 오류: " + e.getMessage());
      response.getWriter().write(errorResponse.toString());
    }
  }
}
