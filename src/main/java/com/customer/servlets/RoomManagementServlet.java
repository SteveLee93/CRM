package com.customer.servlets;

import jakarta.servlet.annotation.MultipartConfig;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.io.BufferedReader;
import java.sql.SQLException;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Part;
import java.io.File;

import org.json.JSONArray;
import org.json.JSONObject;
import com.customer.database.DatabaseManager;

@WebServlet(urlPatterns = { "/room-management", "/api/room", "/api/room/*", "/static/*" })
@MultipartConfig(
    fileSizeThreshold = 1024 * 1024,     // 1MB
    maxFileSize = 1024 * 1024 * 10,      // 10MB
    maxRequestSize = 1024 * 1024 * 15,    // 15MB
    location = "/tmp"                     // 임시 저장 경로
)
public class RoomManagementServlet extends HttpServlet {

  @Override
  public void init() throws ServletException {
    super.init();
    String uploadPath = getServletContext().getRealPath("/uploads/room_images");
    File uploadDir = new File(uploadPath);
    if (!uploadDir.exists()) {
      uploadDir.mkdirs();
    }
  }

  @Override
  protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    String pathInfo = req.getServletPath();
    String subPath = req.getPathInfo();

    if (pathInfo.startsWith("/static/")) {
        handleStaticResource(req, resp);
        return;
    }

    if ("/room-management".equals(pathInfo)) {
        handlePageRequest(resp);
    } else if ("/api/room".equals(pathInfo) && subPath != null) {
        if (subPath.contains("/images")) {
            // /api/room/{roomNumber}/images 처리
            String roomNumber = subPath.split("/")[1];
            handleRoomImagesRequest(resp, roomNumber);
        } else {
            // 단일 객실 정보 요청 처리
            String roomNumber = subPath.substring(1);
            handleSingleRoomRequest(resp, roomNumber);
        }
    } else {
        handleApiRequest(resp);
    }
  }

  private void handlePageRequest(HttpServletResponse resp) throws IOException {
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
  }

  private void handleApiRequest(HttpServletResponse resp) throws IOException {
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

  private void handleStaticResource(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    String fileName = req.getServletPath();
    try (InputStream inputStream = getClass().getClassLoader().getResourceAsStream(fileName.substring(1))) {
      if (inputStream != null) {
        if (fileName.endsWith(".css")) {
          resp.setContentType("text/css");
        } else if (fileName.endsWith(".js")) {
          resp.setContentType("application/javascript");
        }
        resp.setCharacterEncoding("UTF-8");
        
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

  private void handleSingleRoomRequest(HttpServletResponse resp, String roomNumber) throws IOException {
    resp.setContentType("application/json");
    resp.setCharacterEncoding("UTF-8");

    try {
      DatabaseManager db = DatabaseManager.getInstance();
      JSONObject room = db.getRoom(roomNumber);
      resp.getWriter().write(room.toString());
    } catch (SQLException e) {
      handleError(resp, e);
    }
  }

  @Override
  protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException, ServletException {
    String pathInfo = req.getPathInfo();
    String servletPath = req.getServletPath();
    
    // /api/room/image로 들어오는 요청 처리
    if ("/api/room".equals(servletPath) && pathInfo != null && pathInfo.equals("/image")) {
        handleImageUpload(req, resp);
    } else {
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");
        
        try {
            StringBuilder buffer = new StringBuilder();
            try (BufferedReader reader = req.getReader()) {
                String line;
                while ((line = reader.readLine()) != null) {
                    buffer.append(line);
                }
            }

            JSONObject jsonRequest = new JSONObject(buffer.toString());
            String roomNumber = jsonRequest.getString("roomNumber");
            String roomType = jsonRequest.getString("roomType");
            String status = jsonRequest.getString("status");
            
            DatabaseManager db = DatabaseManager.getInstance();

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
            handleError(resp, e);
        }
    }
  }

  private void handleImageUpload(HttpServletRequest req, HttpServletResponse resp) throws IOException, ServletException {
    resp.setContentType("application/json");
    resp.setCharacterEncoding("UTF-8");
    JSONObject result = new JSONObject();

    try {
        Part filePart = req.getPart("image");  // ServletException이 발생할 수 있음
        String roomNumber = req.getParameter("roomNumber");
        
        if (filePart != null && roomNumber != null) {
            // 파일 이름에서 확장자 추출
            String originalFileName = getSubmittedFileName(filePart);
            String fileExtension = originalFileName.substring(originalFileName.lastIndexOf("."));
            String fileName = System.currentTimeMillis() + fileExtension;
            
            // 업로드 디렉토리 생성
            String uploadPath = req.getServletContext().getRealPath("/uploads/room_images");
            File uploadDir = new File(uploadPath);
            if (!uploadDir.exists()) {
                uploadDir.mkdirs();
            }

            // 파일 저장
            String filePath = uploadPath + File.separator + fileName;
            filePart.write(filePath);
            
            // 데이터베이스에 저장
            DatabaseManager db = DatabaseManager.getInstance();
            boolean success = db.addRoomImage(roomNumber, fileName);
            
            result.put("success", success);
            result.put("message", success ? "이미지가 업로드되었습니다." : "이미지 업로드에 실패했습니다.");
            result.put("imagePath", fileName);
        } else {
            result.put("success", false);
            result.put("message", "파일 또는 객실 번호가 없습니다.");
        }
    } catch (Exception e) {
        e.printStackTrace();  // 로그 추가
        result.put("success", false);
        result.put("message", "오류: " + e.getMessage());
    }
    
    resp.getWriter().write(result.toString());
  }

  private String getSubmittedFileName(Part part) {
    String contentDisp = part.getHeader("content-disposition");
    String[] tokens = contentDisp.split(";");
    
    for (String token : tokens) {
        if (token.trim().startsWith("filename")) {
            return token.substring(token.indexOf('=') + 2, token.length() - 1);
        }
    }
    return "";
  }

  @Override
  protected void doPut(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    resp.setContentType("application/json");
    resp.setCharacterEncoding("UTF-8");
    
    try {
        StringBuilder buffer = new StringBuilder();
        try (BufferedReader reader = req.getReader()) {
            String line;
            while ((line = reader.readLine()) != null) {
                buffer.append(line);
            }
        }
        
        JSONObject jsonRequest = new JSONObject(buffer.toString());
        String roomNumber = req.getPathInfo().substring(1);
        String roomType = jsonRequest.getString("roomType");
        String status = jsonRequest.getString("status");
        
        DatabaseManager db = DatabaseManager.getInstance();
        boolean success = db.updateRoom(roomNumber, roomType, status);
        
        JSONObject response = new JSONObject();
        response.put("success", success);
        response.put("message", success ? "객실 정보가 업데이트되었습니다." : "객실 정보 업데이트에 실패했습니다.");
        resp.getWriter().write(response.toString());
        
    } catch (Exception e) {
        handleError(resp, e);
    }
  }

  @Override
  protected void doDelete(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    resp.setContentType("application/json");
    resp.setCharacterEncoding("UTF-8");
    
    try {
        String pathInfo = req.getPathInfo();
        String roomNumber = pathInfo != null ? pathInfo.substring(1) : null;
        
        if (roomNumber == null || roomNumber.isEmpty()) {
            throw new IllegalArgumentException("객실 번호가 필요합니다.");
        }

        System.out.println("Deleting room: " + roomNumber);
        
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

  private void handleRoomImagesRequest(HttpServletResponse resp, String roomNumber) throws IOException {
    resp.setContentType("application/json");
    resp.setCharacterEncoding("UTF-8");
    
    try {
        DatabaseManager db = DatabaseManager.getInstance();
        JSONArray images = db.getRoomImages(roomNumber);
        resp.getWriter().write(images.toString());
    } catch (SQLException e) {
        handleError(resp, e);
    }
  }
}