import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'
import PublicLayout from '../layouts/PublicLayout'
import AuthLayout from '../layouts/AuthLayout'
import CustomerLayout from '../layouts/CustomerLayout'
import StaffLayout from '../layouts/StaffLayout'
import AdminLayout from '../layouts/AdminLayout'
import ErrorLayout from '../layouts/ErrorLayout'
import HomePage from '../pages/public/HomePage'
import SchedulePage from '../pages/public/SchedulePage'
import MovieDetailPage from '../pages/public/MovieDetailPage'
import PromotionsPage from '../pages/public/PromotionsPage'
import PublicPromotionDetailPage from '../pages/public/PublicPromotionDetailPage'
import NearbyCinemasPage from '../pages/public/nearby/NearbyCinemasPage'
import LoginPage from '../pages/public/LoginPage'
import RegisterPage from '../pages/public/RegisterPage'
import ForgotPasswordPage from '../pages/public/ForgotPasswordPage'
import BookingPage from '../pages/customer/BookingPage'
import PaymentPage from '../pages/customer/PaymentPage'
import BookingSuccessPage from '../pages/customer/BookingSuccessPage'
import ProfilePage from '../pages/customer/ProfilePage'
import MyBookingsPage from '../pages/customer/MyBookingsPage'
import StaffDashboardPage from '../pages/staff/StaffDashboardPage'
import CheckinPage from '../pages/staff/CheckinPage'
import StaffBookingLookupPage from '../pages/staff/StaffBookingLookupPage'
import StaffSchedulePage from '../pages/staff/StaffSchedulePage'
import StaffProfilePage from '../pages/staff/StaffProfilePage'
import StaffSupportPage from '../pages/staff/StaffSupportPage'
import DashboardPage from '../pages/admin/DashboardPage'
import UserManagementPage from '../pages/admin/UserManagementPage'
import StaffManagementPage from '../pages/admin/StaffManagementPage'
import CinemaManagementPage from '../pages/admin/CinemaManagementPage'
import MovieManagementPage from '../pages/admin/MovieManagementPage'
import GenreManagementPage from '../pages/admin/GenreManagementPage'
import ShowtimeManagementPage from '../pages/admin/ShowtimeManagementPage'
import BookingManagementPage from '../pages/admin/BookingManagementPage'
import PromotionManagementPage from '../pages/admin/PromotionManagementPage'
import PromotionFormPage from '../pages/admin/PromotionFormPage'
import PromotionDetailPage from '../pages/admin/PromotionDetailPage'
import ForbiddenPage from '../pages/error/ForbiddenPage'
import NotFoundPage from '../pages/error/NotFoundPage'
import { ROLES } from '../constants/roles'

const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/schedule', element: <SchedulePage /> },
      { path: '/movies/:id', element: <MovieDetailPage /> },
      { path: '/cinemas/nearby', element: <NearbyCinemasPage /> },
      { path: '/promotions', element: <PromotionsPage /> },
      { path: '/promotions/:id', element: <PublicPromotionDetailPage /> },
      { 
        element: <ProtectedRoute allowedRoles={[ROLES.CUSTOMER, ROLES.ADMIN, ROLES.STAFF]} />,
        children: [
          { path: '/booking/:showtimeId', element: <BookingPage /> },
          { path: '/payment/:bookingId', element: <PaymentPage /> },
          { path: '/success/:bookingId', element: <BookingSuccessPage /> },
        ]
      }
    ]
  },
  { element: <AuthLayout />, children: [{ path: '/login', element: <LoginPage /> }, { path: '/register', element: <RegisterPage /> }, { path: '/forgot-password', element: <ForgotPasswordPage /> }] },
  { element: <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]} />, children: [{ element: <CustomerLayout />, children: [{ path: '/profile', element: <ProfilePage /> }, { path: '/my-bookings', element: <MyBookingsPage /> }] }] },
  {
    element: <ProtectedRoute allowedRoles={[ROLES.STAFF, ROLES.ADMIN]} />,
    children: [
      {
        element: <StaffLayout />,
        children: [
          { path: '/staff/dashboard', element: <StaffDashboardPage /> },
          { path: '/staff/checkin', element: <CheckinPage /> },
          { path: '/staff/bookings', element: <StaffBookingLookupPage /> },
          { path: '/staff/schedule', element: <StaffSchedulePage /> },
          { path: '/staff/cinemas', element: <CinemaManagementPage /> },
          { path: '/staff/showtimes', element: <ShowtimeManagementPage /> },
          { path: '/staff/support', element: <StaffSupportPage /> },
          { path: '/staff/profile', element: <StaffProfilePage /> },
        ],
      },
    ],
  },
  { element: <ProtectedRoute allowedRoles={[ROLES.ADMIN]} />, children: [{ element: <AdminLayout />, children: [{ path: '/admin/dashboard', element: <DashboardPage /> }, { path: '/admin/profile', element: <StaffProfilePage /> }, { path: '/admin/users', element: <UserManagementPage /> }, { path: '/admin/staffs', element: <StaffManagementPage /> }, { path: '/admin/bookings', element: <BookingManagementPage /> }, { path: '/admin/movies', element: <MovieManagementPage /> }, { path: '/admin/genres', element: <GenreManagementPage /> }, { path: '/admin/promotions', element: <PromotionManagementPage /> }, { path: '/admin/promotions/new', element: <PromotionFormPage /> }, { path: '/admin/promotions/:id', element: <PromotionDetailPage /> }, { path: '/admin/promotions/:id/edit', element: <PromotionFormPage /> }] }] },
  { element: <ProtectedRoute allowedRoles={[ROLES.ADMIN]} />, children: [{ element: <AdminLayout />, children: [{ path: '/admin/cinemas', element: <CinemaManagementPage /> }, { path: '/admin/showtimes', element: <ShowtimeManagementPage /> }] }] },
  { element: <ErrorLayout />, children: [{ path: '/403', element: <ForbiddenPage /> }, { path: '*', element: <NotFoundPage /> }] },
])

export default function AppRouter() {
  return <RouterProvider router={router} />
}
