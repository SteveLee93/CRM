package com.customer.servlets;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.List;

@WebServlet(urlPatterns = {
        "/room-detail",
        "/static/*" // static 리소스 처리를 위한 패턴 추가
})
public class RoomDetailServlet extends HttpServlet {
    private static final String DB_URL = "jdbc:mysql://localhost:3306/crm";
    private static final String DB_USER = "root";
    private static final String DB_PASSWORD = "1234";

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String pathInfo = req.getServletPath();

        // static 리소스 요청 처리
        if (pathInfo.startsWith("/static/")) {
            handleStaticResource(req, resp);
            return;
        }

        // 기존 room-detail 페이지 처리
        handleRoomDetailPage(req, resp);
    }

    // static 리소스 처리 메서드
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

    // 기존 room-detail 페이지 처리 메서드
    private void handleRoomDetailPage(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("text/html; charset=UTF-8");
        StringBuilder htmlContent = new StringBuilder();

        try {
            Class.forName("com.mysql.cj.jdbc.Driver");
            try (Connection conn = DriverManager.getConnection(DB_URL, DB_USER, DB_PASSWORD);
                    Statement stmt = conn.createStatement();
                    ResultSet rs = stmt.executeQuery("SELECT * FROM room")) {

                String filePath = getServletContext().getRealPath("/html/room-detail.html");
                List<String> lines = Files.readAllLines(Paths.get(filePath));

                boolean foundTbody = false;
                for (String line : lines) {
                    if (line.contains("<tbody>")) {
                        foundTbody = true;
                        htmlContent.append(line).append("\n");
                        appendRoomData(rs, htmlContent);
                    } else if (!foundTbody || line.contains("</tbody>")) {
                        htmlContent.append(line).append("\n");
                    }
                }

                resp.getWriter().write(htmlContent.toString());
            }
        } catch (Exception e) {
            e.printStackTrace();
            resp.getWriter().write("데이터베이스 오류: " + e.getMessage());
        }
    }

    // 객실 데이터 추가 메서드
    private void appendRoomData(ResultSet rs, StringBuilder htmlContent) throws Exception {
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
    }

    private String getStatusClass(String status) {
        switch (status.toLowerCase()) {
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
