package com.customer.servlets;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.BufferedReader;
import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import org.json.JSONArray;
import org.json.JSONObject;
import com.customer.database.DatabaseManager;

@WebServlet("/api/reservation/customer/*")
public class CustomerReservationServlet extends HttpServlet {

  @Override
  protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    resp.setContentType("application/json");
    resp.setCharacterEncoding("UTF-8");

    // URL에서 고객 ID 추출 (/api/reservation/customer/5 -> "5")
    String pathInfo = req.getPathInfo();
    String customerId = pathInfo != null ? pathInfo.substring(1) : null;

    if (customerId == null || customerId.isEmpty()) {
      resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
      resp.getWriter().write("{\"error\": \"고객 ID가 필요합니다.\"}");
      return;
    }

    try {
      JSONArray reservations = getCustomerReservations(Integer.parseInt(customerId));
      resp.getWriter().write(reservations.toString());
    } catch (SQLException e) {
      resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
      resp.getWriter().write("{\"error\": \"" + e.getMessage() + "\"}");
    }
  }

  private JSONArray getCustomerReservations(int customerId) throws SQLException {
    // users 테이블에서 먼저 사용자 이름을 가져오는 쿼리
    String sql = "SELECT r.*, rm.room_type " +
        "FROM reservation r " +
        "JOIN room rm ON r.room_number = rm.room_number " +
        "JOIN user u ON r.name = u.name " + // users 테이블과 name으로 조인
        "WHERE u.id = ? " +
        "ORDER BY r.reservation_dt DESC";

    JSONArray reservations = new JSONArray();

    try (Connection conn = DatabaseManager.getInstance().getConnection();
        PreparedStatement stmt = conn.prepareStatement(sql)) {

      stmt.setInt(1, customerId);
      System.out.println("Executing query for customer ID: " + customerId);

      try (ResultSet rs = stmt.executeQuery()) {
        while (rs.next()) {
          JSONObject reservation = new JSONObject();
          reservation.put("id", rs.getInt("id"));
          reservation.put("roomNumber", rs.getString("room_number"));
          reservation.put("roomType", rs.getString("room_type"));
          reservation.put("checkinDt", rs.getString("checkin_dt"));
          reservation.put("checkoutDt", rs.getString("checkout_dt"));
          reservation.put("reservationDt", rs.getString("reservation_dt"));
          reservation.put("name", rs.getString("name"));
          reservations.put(reservation);
        }
      }
    } catch (SQLException e) {
      e.printStackTrace();
      System.err.println("SQL Error: " + e.getMessage());
      throw new SQLException("예약 정보 조회 중 오류 발생: " + e.getMessage());
    }

    return reservations;
  }

  @Override
  protected void doPut(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    resp.setContentType("application/json");
    resp.setCharacterEncoding("UTF-8");

    // URL에서 예약 ID 추출
    String pathInfo = req.getPathInfo();
    String reservationId = pathInfo != null ? pathInfo.substring(1) : null;

    if (reservationId == null || reservationId.isEmpty()) {
      resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
      resp.getWriter().write("{\"success\": false, \"message\": \"예약 ID가 필요합니다.\"}");
      return;
    }

    // 요청 본문 읽기
    StringBuilder buffer = new StringBuilder();
    String line;
    try (BufferedReader reader = req.getReader()) {
      while ((line = reader.readLine()) != null) {
        buffer.append(line);
      }
    }

    // JSON 파싱
    JSONObject jsonRequest = new JSONObject(buffer.toString());
    String roomNumber = jsonRequest.getString("roomNumber");
    String checkinDt = jsonRequest.getString("checkinDt");
    String checkoutDt = jsonRequest.getString("checkoutDt");

    try {
      updateReservation(Integer.parseInt(reservationId), roomNumber, checkinDt, checkoutDt);
      resp.getWriter().write("{\"success\": true}");
    } catch (SQLException e) {
      resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
      resp.getWriter().write("{\"success\": false, \"message\": \"" + e.getMessage() + "\"}");
    }
  }

  private void updateReservation(int reservationId, String roomNumber, String checkinDt, String checkoutDt)
      throws SQLException {
    Connection conn = null;
    try {
      conn = DatabaseManager.getInstance().getConnection();
      conn.setAutoCommit(false);

      // 1. 기존 예약 정보 조회
      String selectSql = "SELECT room_number FROM reservation WHERE id = ?";
      try (PreparedStatement selectStmt = conn.prepareStatement(selectSql)) {
        selectStmt.setInt(1, reservationId);
        ResultSet rs = selectStmt.executeQuery();
        if (!rs.next()) {
          throw new SQLException("예약 정보를 찾을 수 없습니다.");
        }
        String oldRoomNumber = rs.getString("room_number");

        // 2. 새로운 객실이 예약 가능한지 확인 - 쿼리 수정
        String checkAvailabilitySql = "SELECT COUNT(*) as count FROM reservation " +
            "WHERE room_number = ? " +
            "AND id != ? " + // 현재 수정중인 예약은 제외
            "AND NOT (" +
            "checkout_dt <= ? " + // 새로운 체크인 전에 끝나거나
            "OR checkin_dt >= ? " + // 새로운 체크아웃 후에 시작하는 예약
            ")";

        try (PreparedStatement checkStmt = conn.prepareStatement(checkAvailabilitySql)) {
          checkStmt.setString(1, roomNumber);
          checkStmt.setInt(2, reservationId);
          checkStmt.setString(3, checkinDt); // 새로운 체크인 날짜
          checkStmt.setString(4, checkoutDt); // 새로운 체크아웃 날짜

          System.out.println("Checking availability for room " + roomNumber +
              " between " + checkinDt + " and " + checkoutDt);

          ResultSet availRs = checkStmt.executeQuery();
          if (availRs.next() && availRs.getInt("count") > 0) {
            throw new SQLException("선택한 기간에 이미 예약된 객실입니다.");
          }
        }

        // 3. 예약 정보 업데이트
        String updateReservationSql = "UPDATE reservation SET room_number = ?, checkin_dt = ?, checkout_dt = ? WHERE id = ?";
        try (PreparedStatement updateReservationStmt = conn.prepareStatement(updateReservationSql)) {
          updateReservationStmt.setString(1, roomNumber);
          updateReservationStmt.setString(2, checkinDt);
          updateReservationStmt.setString(3, checkoutDt);
          updateReservationStmt.setInt(4, reservationId);
          updateReservationStmt.executeUpdate();
        }
      }

      conn.commit();
    } catch (SQLException e) {
      if (conn != null) {
        try {
          conn.rollback();
        } catch (SQLException ex) {
          throw new SQLException("롤백 실패: " + ex.getMessage());
        }
      }
      throw new SQLException("예약 수정 중 오류 발생: " + e.getMessage());
    } finally {
      if (conn != null) {
        try {
          conn.setAutoCommit(true);
          conn.close();
        } catch (SQLException e) {
          e.printStackTrace();
        }
      }
    }
  }
}