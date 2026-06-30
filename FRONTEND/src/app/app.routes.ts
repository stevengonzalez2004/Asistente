import { Routes } from '@angular/router';
import { adminGuard } from './core/admin.guard';
import { userGuard } from './core/user.guard';
import { AdminDashboard } from './pages/admin-dashboard/admin-dashboard';
import { Login } from './pages/login/login';
import { UserDashboard } from './pages/user-dashboard/user-dashboard';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'admin', component: AdminDashboard, canActivate: [adminGuard] },
  { path: 'usuario', component: UserDashboard, canActivate: [userGuard] },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' },
];
