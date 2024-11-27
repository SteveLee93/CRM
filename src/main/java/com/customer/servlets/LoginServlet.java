package com.customer.servlets;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

@WebServlet("/login")
public class LoginServlet extends HttpServlet {
	private static final String DB_URL = "jdbc:mysql://localhost:3306/crm";
	private static final String DB_USER = "root";
	private static final String DB_PASSWORD = "1234";

	@Override
	protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
		resp.setContentType("text/html; charset=UTF-8");

		// login.html 파일 경로 설정
		String filePath = getServletContext().getRealPath("/html/login.html");

		// login.html 파일 읽기 및 반환
		Files.lines(Paths.get(filePath)).forEach(line -> {
			try {
				resp.getWriter().println(line);
			} catch (IOException e) {
				e.printStackTrace();
			}
		});
	}

	@Override
	protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
		String userId = req.getParameter("username");
		String password = req.getParameter("password");
		
		System.out.println("Login attempt - Username: " + userId); // 로그인 시도 로그

		try (Connection connection = DriverManager.getConnection(DB_URL, DB_USER, DB_PASSWORD)) {
			String query = "SELECT username, admin_yn FROM user WHERE username = ? AND password = ?";
			System.out.println("Executing query: " + query); // SQL 쿼리 로그
			
			PreparedStatement stmt = connection.prepareStatement(query);
			stmt.setString(1, userId);
			stmt.setString(2, password);

			ResultSet rs = stmt.executeQuery();

			resp.setContentType("text/html; charset=UTF-8");
			if (rs.next()) {
				boolean isAdmin = rs.getBoolean("admin_yn");
				System.out.println("Login successful - Username: " + userId + ", admin_yn value: " + isAdmin); // DB 값 로그
				
				HttpSession session = req.getSession();
				session.setAttribute("username", userId);
				session.setAttribute("isAdmin", isAdmin);
				
				System.out.println("Session created - isAdmin attribute: " + session.getAttribute("isAdmin")); // 세션 저장 로그
				
				resp.sendRedirect(req.getContextPath() + "/dashboard");
			} else {
				System.out.println("Login failed - Invalid credentials"); // 로그인 실패 로그
				resp.sendRedirect("/login?error=true"); // 에러 파라미터 추가
			}
		} catch (Exception e) {
			System.err.println("Login error: " + e.getMessage()); // 에러 로그
			e.printStackTrace();
			resp.getWriter().println("<html><body>");
			resp.getWriter().println("<h1>오류 발생: " + e.getMessage() + "</h1>");
			resp.getWriter().println("</body></html>");
		}
	}
}
