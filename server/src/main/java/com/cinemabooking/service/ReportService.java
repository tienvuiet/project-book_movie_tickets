package com.cinemabooking.service;

import java.time.LocalDate;

public interface ReportService {
    Object getDashboard();
    Object getRevenue(LocalDate from, LocalDate to);
}


