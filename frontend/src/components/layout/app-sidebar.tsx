"use client"

import * as React from "react"
import { 
  FileText, 
  Shield, 
  Users, 
  Activity, 
  Settings, 
  Home,
  Upload,
  Eye,
  UserCheck,
  ClipboardList
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

// Navigation items for different user roles
const navigationItems = {
  patient: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
    },
    {
      title: "My Records",
      url: "/records",
      icon: FileText,
    },
    {
      title: "Upload Record",
      url: "/records/upload",
      icon: Upload,
    },
    {
      title: "Consent Management",
      url: "/consent",
      icon: Shield,
    },
    {
      title: "Access History",
      url: "/audit",
      icon: Activity,
    },
  ],
  doctor: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
    },
    {
      title: "Patient Records",
      url: "/records",
      icon: FileText,
    },
    {
      title: "Upload Results",
      url: "/records/upload",
      icon: Upload,
    },
    {
      title: "Patient Approvals",
      url: "/approvals",
      icon: UserCheck,
    },
    {
      title: "Audit Trail",
      url: "/audit",
      icon: Activity,
    },
  ],
  laboratory: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
    },
    {
      title: "Test Results",
      url: "/records",
      icon: FileText,
    },
    {
      title: "Upload Results",
      url: "/records/upload",
      icon: Upload,
    },
    {
      title: "Audit Trail",
      url: "/audit",
      icon: Activity,
    },
  ],
  insurer: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
    },
    {
      title: "Claims Review",
      url: "/claims",
      icon: ClipboardList,
    },
    {
      title: "Patient Records",
      url: "/records",
      icon: Eye,
    },
    {
      title: "Audit Trail",
      url: "/audit",
      icon: Activity,
    },
  ],
  auditor: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
    },
    {
      title: "Audit Trail",
      url: "/audit",
      icon: Activity,
    },
    {
      title: "Compliance Reports",
      url: "/compliance",
      icon: ClipboardList,
    },
    {
      title: "System Users",
      url: "/users",
      icon: Users,
    },
  ],
  system_admin: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
    },
    {
      title: "User Management",
      url: "/users",
      icon: Users,
    },
    {
      title: "Registration Approvals",
      url: "/approvals",
      icon: UserCheck,
    },
    {
      title: "System Settings",
      url: "/settings",
      icon: Settings,
    },
    {
      title: "Audit Trail",
      url: "/audit",
      icon: Activity,
    },
  ],
}

export function AppSidebar() {
  // This would come from authentication context in a real app
  const userRole = "patient" // Default for demo
  const userName = "John Doe"
  const userEmail = "john.doe@example.com"
  
  const items = navigationItems[userRole as keyof typeof navigationItems] || navigationItems.patient

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Activity className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Healthcare DLT</h2>
            <p className="text-xs text-muted-foreground">Quantum-Resistant</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8">
            <AvatarFallback>{userName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userName}</p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs capitalize">
                {userRole.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}