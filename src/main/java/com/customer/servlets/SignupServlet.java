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
import java.sql.PreparedStatement;

@WebServlet("/signup")
public class SignupServlet extends HttpServlet {
	private static final String DB_URL = "jdbc:mysql://localhost:3306/crm";
	private static final String DB_USER = "root";
	private static final String DB_PASSWORD = "1234";

	@Override
	protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
		resp.setContentType("text/html; charset=UTF-8");
		System.out.println("요청 방식: " + req.getMethod());
		// signup.html 파일 경로 설정
		String filePath = getServletContext().getRealPath("/html/signup.html");

		// signup.html 파일 읽기 및 반환
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
		// 클라이언트에서 전달된 데이터 가져오기
		System.out.println("doPost 호출됨"); // 디버깅용 로그

		String userId = req.getParameter("username");
		String name = req.getParameter("name");
		String email = req.getParameter("email");
		String password = req.getParameter("password");

		try (Connection connection = DriverManager.getConnection(DB_URL, DB_USER, DB_PASSWORD)) {
			// SQL INSERT 쿼리
			String query = "INSERT INTO user (username, name, email, password) VALUES (?, ?, ?, ?)";
			PreparedStatement stmt = connection.prepareStatement(query);
			stmt.setString(1, userId);
			stmt.setString(2, name);
			stmt.setString(3, email);
			stmt.setString(4, password);

			stmt.executeUpdate();

			// 회원가입 성공 후 로그인 페이지로 리다이렉트
			resp.sendRedirect("/login");
		} catch (Exception e) {
			// 오류 처리
			e.printStackTrace();
			resp.setContentType("text/html; charset=UTF-8");
			resp.getWriter().println("<h1>오류 발생: " + e.getMessage() + "</h1>");
		}
	}
}
