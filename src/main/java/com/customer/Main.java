package com.customer;

import org.apache.catalina.Context;
import org.apache.catalina.startup.Tomcat;
import org.apache.catalina.servlets.DefaultServlet;
import com.customer.servlets.DashboardServlet;
import com.customer.servlets.RoomManagementServlet;
import com.customer.servlets.LoginServlet;
import com.customer.servlets.MainServlet;
import com.customer.servlets.AdminCheckServlet;
import com.customer.servlets.SignupServlet;
import com.customer.servlets.LogoutServlet;
import com.customer.servlets.SessionCheckServlet;
import com.customer.servlets.CheckUsernameServlet;
import com.customer.servlets.CheckEmailServlet;
import com.customer.servlets.CustomerManagementServlet;
import java.io.File;

public class Main {
	public static void main(String[] args) throws Exception {
		Tomcat tomcat = new Tomcat();
		tomcat.setPort(8080);
		tomcat.getConnector();

		String baseDir = new File("target/tomcat").getAbsolutePath();
		tomcat.setBaseDir(baseDir);

		String docBase = new File("src/main/resources").getAbsolutePath();
		Context ctx = tomcat.addContext("", docBase);

		Tomcat.addServlet(ctx, "defaultServlet", new DefaultServlet());
		ctx.addServletMappingDecoded("/", "defaultServlet");
		ctx.addServletMappingDecoded("/html/*", "defaultServlet");
		ctx.addServletMappingDecoded("/components/*", "defaultServlet");

		Tomcat.addServlet(ctx, "mainServlet", new MainServlet());
		ctx.addServletMappingDecoded("/", "mainServlet");

		Tomcat.addServlet(ctx, "loginServlet", new LoginServlet());
		ctx.addServletMappingDecoded("/login", "loginServlet");
		ctx.addServletMappingDecoded("/api/login", "loginServlet");

		Tomcat.addServlet(ctx, "dashboardServlet", new DashboardServlet());
		ctx.addServletMappingDecoded("/dashboard", "dashboardServlet");
		ctx.addServletMappingDecoded("/api/dashboard", "dashboardServlet");

		Tomcat.addServlet(ctx, "roomManagementServlet", new RoomManagementServlet());
		ctx.addServletMappingDecoded("/room-management", "roomManagementServlet");
		ctx.addServletMappingDecoded("/api/room", "roomManagementServlet");
		ctx.addServletMappingDecoded("/api/room/*", "roomManagementServlet");

		Tomcat.addServlet(ctx, "adminCheckServlet", new AdminCheckServlet());
		ctx.addServletMappingDecoded("/api/check-admin", "adminCheckServlet");

		Tomcat.addServlet(ctx, "signupServlet", new SignupServlet());
		ctx.addServletMappingDecoded("/signup", "signupServlet");

		Tomcat.addServlet(ctx, "logoutServlet", new LogoutServlet());
		ctx.addServletMappingDecoded("/api/logout", "logoutServlet");

		Tomcat.addServlet(ctx, "sessionCheckServlet", new SessionCheckServlet());
		ctx.addServletMappingDecoded("/api/check-session", "sessionCheckServlet");

		Tomcat.addServlet(ctx, "checkUsernameServlet", new CheckUsernameServlet());
		ctx.addServletMappingDecoded("/api/check-username", "checkUsernameServlet");

		Tomcat.addServlet(ctx, "checkEmailServlet", new CheckEmailServlet());
		ctx.addServletMappingDecoded("/api/check-email", "checkEmailServlet");

		Tomcat.addServlet(ctx, "customerManagementServlet", new CustomerManagementServlet());
		ctx.addServletMappingDecoded("/customer-management", "customerManagementServlet");
		ctx.addServletMappingDecoded("/api/customer", "customerManagementServlet");
		ctx.addServletMappingDecoded("/api/customer/*", "customerManagementServlet");

		try {
			tomcat.start();
			System.out.println("Server started on port 8080");
			tomcat.getServer().await();
		} catch (Exception e) {
			e.printStackTrace();
		}
	}
}
