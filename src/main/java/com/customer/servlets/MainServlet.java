package com.customer.servlets;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.InputStream;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

@WebServlet("/")
public class MainServlet extends HttpServlet {

  @Override
  protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    resp.setContentType("text/html; charset=UTF-8");

    // ClassLoader를 사용하여 리소스 읽기
    try (InputStream inputStream = getClass().getClassLoader().getResourceAsStream("html/index.html")) {
      if (inputStream != null) {
        try (BufferedReader reader = new BufferedReader(
            new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
          String line;
          while ((line = reader.readLine()) != null) {
            resp.getWriter().println(line);
          }
        }
      } else {
        resp.getWriter().println("Error: index.html file not found");
      }
    }
  }
}