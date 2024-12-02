package com.customer.servlets.ReservationStatisticsPage;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.io.InputStream;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import org.json.JSONObject;
import org.json.JSONArray;
import com.customer.database.DatabaseManager;

@WebServlet(urlPatterns = { "/reservationStatistics", "/api/statistics" })
public class ReservationStatisticsServlet extends HttpServlet {
  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
    HttpSession session = request.getSession(false);
    if (session == null || session.getAttribute("username") == null) {
      response.sendRedirect("/login");
      return;
    }

    String pathInfo = request.getServletPath();

        if (pathInfo.startsWith("/static/")) {
            handleStaticResource(request, response);
            return;
        }

        if ("/api/statistics".equals(pathInfo)) {
            handleStatisticsAPI(response);
        } else {
            handlePageRequest(response);
        }
    }

    private void handlePageRequest(HttpServletResponse response) throws IOException {
        response.setContentType("text/html; charset=UTF-8");
        try (InputStream in = getClass().getClassLoader()
                .getResourceAsStream("html/reservationStatistics.html")) {
            if (in != null) {
                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(in, StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        response.getWriter().println(line);
                    }
                }
            }
        }
    }

    private void handleStatisticsAPI(HttpServletResponse response) throws IOException {
        JSONObject statistics = new JSONObject();
        try (Connection conn = DatabaseManager.getInstance().getConnection()) {
            // 기본 통계 데이터 수집
            JSONObject overview = getOverviewStatistics(conn);
            if (overview == null) {
                overview = new JSONObject();
                overview.put("totalReservations", 0);
                overview.put("avgStayDuration", 0);
                overview.put("popularRoomType", "없음");
            }
            statistics.put("overview", overview);
            statistics.put("monthlyTrend", getMonthlyTrend(conn));
            statistics.put("roomTypeDistribution", getRoomTypeDistribution(conn));
            statistics.put("weekdayPattern", getWeekdayPattern(conn));
            statistics.put("stayDurationDistribution", getStayDurationDistribution(conn));

            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            PrintWriter out = response.getWriter();
            out.print(statistics.toString());
            out.flush();
        } catch (SQLException e) {
            handleError(response, e);
        }
    }

    private void handleError(HttpServletResponse response, SQLException e) throws IOException {
        response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        JSONObject error = new JSONObject();
        error.put("error", e.getMessage());
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(error.toString());
    }

    private void handleStaticResource(HttpServletRequest request, HttpServletResponse response) throws IOException {
        String fileName = request.getServletPath();
        try (InputStream in = getClass().getClassLoader().getResourceAsStream(fileName.substring(1))) {
            if (in != null) {
                if (fileName.endsWith(".css")) {
                    response.setContentType("text/css");
                } else if (fileName.endsWith(".js")) {
                    response.setContentType("application/javascript");
                }
                response.setCharacterEncoding("UTF-8");
                byte[] buffer = new byte[1024];
                int bytesRead;
                while ((bytesRead = in.read(buffer)) != -1) {
                    response.getOutputStream().write(buffer, 0, bytesRead);
                }
            } else {
                response.sendError(HttpServletResponse.SC_NOT_FOUND);
            }
        }
    }

    private JSONObject getOverviewStatistics(Connection conn) throws SQLException {
        JSONObject overview = new JSONObject();
        
        // 총 예약 수
        String totalQuery = "SELECT COUNT(*) as total FROM reservation";
        try (PreparedStatement pstmt = conn.prepareStatement(totalQuery)) {
            ResultSet rs = pstmt.executeQuery();
            if (rs.next()) {
                overview.put("totalReservations", rs.getInt("total"));
            }
        }

        // 평균 숙박 기간
        String avgStayQuery = """
            SELECT AVG(DATEDIFF(checkout_dt, checkin_dt)) as avg_stay 
            FROM reservation
            WHERE checkout_dt > checkin_dt
        """;
        try (PreparedStatement pstmt = conn.prepareStatement(avgStayQuery)) {
            ResultSet rs = pstmt.executeQuery();
            if (rs.next()) {
                overview.put("avgStayDuration", Math.round(rs.getDouble("avg_stay") * 10.0) / 10.0);
            }
        }

        // 가장 인기있는 객실 타입
        String popularRoomQuery = """
            SELECT r.room_type, COUNT(*) as booking_count
            FROM reservation res
            JOIN room r ON res.room_number = r.room_number
            GROUP BY r.room_type
            ORDER BY booking_count DESC
            LIMIT 1
        """;
        try (PreparedStatement pstmt = conn.prepareStatement(popularRoomQuery)) {
            ResultSet rs = pstmt.executeQuery();
            if (rs.next()) {
                overview.put("popularRoomType", rs.getString("room_type"));
            }
        }

        return overview;
    }

    private JSONArray getMonthlyTrend(Connection conn) throws SQLException {
        JSONArray monthlyTrend = new JSONArray();
        String query = """
                SELECT
                    DATE_FORMAT(checkin_dt, '%Y-%m') as month,
                    COUNT(*) as reservation_count
                FROM reservation
                GROUP BY month
                ORDER BY month
            """;

        try (PreparedStatement pstmt = conn.prepareStatement(query)) {
            ResultSet rs = pstmt.executeQuery();
            while (rs.next()) {
                JSONObject monthData = new JSONObject();
                monthData.put("month", rs.getString("month"));
                monthData.put("count", rs.getInt("reservation_count"));
                monthlyTrend.put(monthData);
            }
        }
        return monthlyTrend;
    }

  private JSONArray getRoomTypeDistribution(Connection conn) throws SQLException {
    JSONArray distribution = new JSONArray();
    String query = """
            SELECT
                r.room_type,
                COUNT(*) as booking_count
            FROM reservation res
            JOIN room r ON res.room_number = r.room_number
            GROUP BY r.room_type
        """;

    try (PreparedStatement pstmt = conn.prepareStatement(query)) {
      ResultSet rs = pstmt.executeQuery();
      while (rs.next()) {
        JSONObject roomTypeData = new JSONObject();
        roomTypeData.put("roomType", rs.getString("room_type"));
        roomTypeData.put("count", rs.getInt("booking_count"));
        distribution.put(roomTypeData);
      }
    }
    return distribution;
  }

  private JSONObject getWeekdayPattern(Connection conn) throws SQLException {
    JSONObject pattern = new JSONObject();
    String query = """
            SELECT
                DAYOFWEEK(checkin_dt) as check_in_day,
                DAYOFWEEK(checkout_dt) as check_out_day,
                COUNT(*) as count
            FROM reservation
            GROUP BY check_in_day, check_out_day
        """;

    try (PreparedStatement pstmt = conn.prepareStatement(query)) {
      ResultSet rs = pstmt.executeQuery();
      int[] checkIns = new int[7];
      int[] checkOuts = new int[7];

      while (rs.next()) {
        checkIns[rs.getInt("check_in_day") - 1] += rs.getInt("count");
        checkOuts[rs.getInt("check_out_day") - 1] += rs.getInt("count");
      }

      pattern.put("checkIns", new JSONArray(checkIns));
      pattern.put("checkOuts", new JSONArray(checkOuts));
    }
    return pattern;
  }

  private JSONArray getStayDurationDistribution(Connection conn) throws SQLException {
    JSONArray distribution = new JSONArray();
    String query = """
            SELECT
                CASE
                    WHEN DATEDIFF(checkout_dt, checkin_dt) = 1 THEN '1일'
                    WHEN DATEDIFF(checkout_dt, checkin_dt) = 2 THEN '2일'
                    WHEN DATEDIFF(checkout_dt, checkin_dt) = 3 THEN '3일'
                    WHEN DATEDIFF(checkout_dt, checkin_dt) = 4 THEN '4일'
                    ELSE '5일+'
                END as stay_duration,
                COUNT(*) as count
            FROM reservation
            GROUP BY stay_duration
            ORDER BY
                CASE stay_duration
                    WHEN '1일' THEN 1
                    WHEN '2일' THEN 2
                    WHEN '3일' THEN 3
                    WHEN '4일' THEN 4
                    ELSE 5
                END
        """;

    try (PreparedStatement pstmt = conn.prepareStatement(query)) {
      ResultSet rs = pstmt.executeQuery();
      while (rs.next()) {
        JSONObject durationData = new JSONObject();
        durationData.put("duration", rs.getString("stay_duration"));
        durationData.put("count", rs.getInt("count"));
        distribution.put(durationData);
      }
    }
    return distribution;
  }
}
