package com.customer.servlets;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.json.JSONArray;
import org.json.JSONObject;
import com.customer.database.DatabaseManager;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

@WebServlet("/api/room/occupied")
public class RoomOccupiedServlet extends HttpServlet {

  @Override
  protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    resp.setContentType("application/json");
    resp.setCharacterEncoding("UTF-8");

    String checkinDate = req.getParameter("checkinDate");
    String checkoutDate = req.getParameter("checkoutDate");
    String excludeReservationId = req.getParameter("excludeReservationId");

    try {
      JSONObject response = new JSONObject();
      response.put("rooms", getAllRooms());
      response.put("occupiedRooms", getOccupiedRooms(
          checkinDate,
          checkoutDate,
          excludeReservationId != null ? Integer.parseInt(excludeReservationId) : 0));

      resp.getWriter().write(response.toString());
    } catch (SQLException e) {
      resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
      resp.getWriter().write("{\"error\": \"" + e.getMessage() + "\"}");
    }
  }

  private JSONArray getOccupiedRooms(String checkinDt, String checkoutDt, int excludeReservationId)
      throws SQLException {
    String sql = "SELECT DISTINCT r.room_number, rm.room_type " +
        "FROM reservation r " +
        "JOIN room rm ON r.room_number = rm.room_number " +
        "WHERE r.id != ? " + // 현재 수정 중인 예약은 제외
        "AND (" +
        "(? BETWEEN r.checkin_dt AND r.checkout_dt) OR " + // 체크인 날짜가 예약 기간 내에 있는 경우
        "(? BETWEEN r.checkin_dt AND r.checkout_dt) OR " + // 체크아웃 날짜가 예약 기간 내에 있는 경우
        "(r.checkin_dt BETWEEN ? AND ?) OR " + // 예약 시작일이 지정 기간 내에 있는 경우
        "(r.checkout_dt BETWEEN ? AND ?)" + // 예약 종료일이 지정 기간 내에 있는 경우
        ")";

    JSONArray occupiedRooms = new JSONArray();

    try (Connection conn = DatabaseManager.getInstance().getConnection();
        PreparedStatement stmt = conn.prepareStatement(sql)) {

      stmt.setInt(1, excludeReservationId);
      stmt.setString(2, checkinDt);
      stmt.setString(3, checkoutDt);
      stmt.setString(4, checkinDt);
      stmt.setString(5, checkoutDt);
      stmt.setString(6, checkinDt);
      stmt.setString(7, checkoutDt);

      System.out.println("Checking occupied rooms for dates: " + checkinDt + " to " + checkoutDt);

      try (ResultSet rs = stmt.executeQuery()) {
        while (rs.next()) {
          JSONObject room = new JSONObject();
          room.put("roomNumber", rs.getString("room_number"));
          room.put("roomType", rs.getString("room_type"));
          room.put("status", "occupied");
          occupiedRooms.put(room);
        }
      }
    }
    return occupiedRooms;
  }

  private JSONArray getAllRooms() throws SQLException {
    String sql = "SELECT room_number, room_type, status FROM room ORDER BY room_number";
    JSONArray rooms = new JSONArray();

    try (Connection conn = DatabaseManager.getInstance().getConnection();
        PreparedStatement stmt = conn.prepareStatement(sql);
        ResultSet rs = stmt.executeQuery()) {

      while (rs.next()) {
        JSONObject room = new JSONObject();
        room.put("roomNumber", rs.getString("room_number"));
        room.put("roomType", rs.getString("room_type"));
        room.put("status", rs.getString("status").toLowerCase());
        rooms.put(room);
      }
    }
    return rooms;
  }
}