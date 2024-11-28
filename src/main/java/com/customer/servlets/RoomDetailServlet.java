package com.customer.servlets;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.List;

@WebServlet("/room-detail")
public class RoomDetailServlet extends HttpServlet {
  private static final String DB_URL = "jdbc:mysql://localhost:3306/crm";
  private static final String DB_USER = "root";
  private static final String DB_PASSWORD = "1234";

  @Override
  protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    resp.setContentType("text/html; charset=UTF-8");
    StringBuilder htmlContent = new StringBuilder();

    try {
      // MySQL JDBC 드라이버 로드
      Class.forName("com.mysql.cj.jdbc.Driver");

      // 데이터베이스 연결 및 쿼리 실행
      try (Connection conn = DriverManager.getConnection(DB_URL, DB_USER, DB_PASSWORD);
           Statement stmt = conn.createStatement();
           ResultSet rs = stmt.executeQuery("SELECT * FROM room")) {

        // HTML 파일의 윗부분 읽기
        String filePath = getServletContext().getRealPath("/html/room-detail.html");
        List<String> lines = Files.readAllLines(Paths.get(filePath));

        // tbody 태그를 찾을 때까지 HTML 내용 추가
        boolean foundTbody = false;
        for (String line : lines) {
          if (line.contains("<tbody>")) {
            foundTbody = true;
            htmlContent.append(line).append("\n");

            // 데이터베이스에서 가져온 정보로 테이블 행 생성
            while (rs.next()) {
              String roomNumber = rs.getString("room_number");
              String roomType = rs.getString("room_type");
              String roomStatus = rs.getString("room_status");

              String statusClass = getStatusClass(roomStatus);

              htmlContent.append("<tr>\n")
                      .append("    <td>").append(roomNumber).append("</td>\n")
                      .append("    <td>").append(roomType).append("</td>\n")
                      .append("    <td class=\"").append(statusClass).append("\">")
                      .append(roomStatus).append("</td>\n")
                      .append("</tr>\n");
            }
          } else if (!foundTbody || line.contains("</tbody>")) {
            htmlContent.append(line).append("\n");
          }
        }

        // HTML 내용 출력
        resp.getWriter().write(htmlContent.toString());
      }
    } catch (Exception e) {
      e.printStackTrace();
      resp.getWriter().write("데이터베이스 오류: " + e.getMessage());
    }
  }

  private String getStatusClass(String status) {
    switch(status.toLowerCase()) {
      case "이용가능":
        return "status-available";
      case "사용중":
        return "status-occupied";
      case "청소중":
        return "status-cleaning";
      default:
        return "";
    }
  }
}
