"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Home,
  Shield,
  LogOut,
  LoaderCircle,
  BookOpenCheck,
  Settings,
  BookCopy,
  Sun,
  Moon,
  User as UserIcon,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { useUser, useAuth, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from 'firebase/firestore';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { cn } from "@/lib/utils";
import type { User as AppUser } from '@/lib/types';


const menuItems = [
  { icon: Home, label: "होम", href: "/home" },
  { icon: BookCopy, label: "All Combos", href: "/combos" },
];

const bottomMenuItems = [
    { icon: Settings, label: "सेटिंग्स", href: "#" },
    { icon: UserIcon, label: "प्रोफाइल", href: "#" },
    { icon: FileText, label: "Privacy Policy", href: "/privacy-policy" },
    { icon: ShieldCheck, label: "Terms & Conditions", href: "/terms-conditions" },
]

const adminItems = [
  { icon: Shield, label: "एडमिन पैनल", href: "/admin" },
];

// Helper function to generate a color from a string (e.g., user ID)
const generateColorFromString = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF)
        .toString(16)
        .toUpperCase();

    const color = "00000".substring(0, 6 - c.length) + c;
    return `#${color}`;
};


function ThemeToggleButton() {
    const { theme, setTheme } = useTheme();
    const { setOpenMobile } = useSidebar();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => setMounted(true), []);

    if (!mounted) {
        return <SidebarMenuButton disabled={true}><LoaderCircle className="w-5 h-5 animate-spin"/></SidebarMenuButton>
    }

    const isDark = theme === 'dark';

    return (
        <SidebarMenuButton onClick={() => {
            setTheme(isDark ? 'light' : 'dark');
            setOpenMobile(false);
        }}>
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span>{isDark ? 'लाइट मोड' : 'डार्क मोड'}</span>
        </SidebarMenuButton>
    )
}

function AppSidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const firestore = useFirestore();
  const { setOpenMobile } = useSidebar();

  const userDocRef = useMemoFirebase(() => {
      if (!user) return null;
      return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: appUser } = useDoc<AppUser>(userDocRef);

  const handleLogout = async () => {
    localStorage.removeItem("admin_security_verified");
    await auth.signOut();
    router.push('/login');
  };

  const userAvatar = PlaceHolderImages.find(img => img.id === 'user-avatar-1');
  const userName = appUser?.fullName || user?.email || "User";
  const userRole = appUser?.role;
  const userInitial = (appUser?.fullName || user?.email || "U").charAt(0).toUpperCase();

  const avatarBgColor = React.useMemo(() => user ? generateColorFromString(user.uid) : '#cccccc', [user]);

  const handleMenuItemClick = () => {
    setOpenMobile(false);
  }

  return (
    <div className="bg-gradient-to-b from-blue-900 via-purple-900 to-teal-900 h-full flex flex-col">
      <SidebarHeader className="p-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 border-2 border-white/50">
            {userAvatar && false ? <AvatarImage src={userAvatar.imageUrl} alt={userName} data-ai-hint={userAvatar.imageHint}/> : null}
            <AvatarFallback style={{ backgroundColor: avatarBgColor }} className="text-white font-bold text-lg">
                {userInitial}
            </AvatarFallback>
          </Avatar>
          <div className="text-white">
            <p className="font-semibold">{userName}</p>
            <p className="text-xs text-white/70">{userRole === 'admin' ? 'एडमिनिस्ट्रेटर' : 'MPSE / State Exam'}</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2 flex-1">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <Link href={item.href} className="w-full" onClick={handleMenuItemClick}>
                <SidebarMenuButton
                  className="text-sidebar-foreground hover:bg-white/10 hover:text-white data-[active=true]:bg-white/20 data-[active=true]:text-white"
                  isActive={pathname === item.href}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        {userRole === 'admin' && (
          <>
            <div className="px-4 my-2">
                <p className="text-xs font-semibold text-white/50 tracking-wider uppercase">एडमिन</p>
            </div>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <Link href={item.href} className="w-full" onClick={handleMenuItemClick}>
                    <SidebarMenuButton
                      className="text-sidebar-foreground hover:bg-white/10 hover:text-white data-[active=true]:bg-white/20 data-[active=true]:text-white"
                      isActive={pathname === item.href || pathname.startsWith(item.href)}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </>
        )}
        
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-white/10 mt-auto">
         <SidebarMenu>
            {bottomMenuItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                    <Link href={item.href} className="w-full" onClick={handleMenuItemClick}>
                        <SidebarMenuButton className="text-sidebar-foreground hover:bg-white/10 hover:text-white"
                          isActive={pathname === item.href}>
                            <item.icon className="w-5 h-5" />
                            <span>{item.label}</span>
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
            ))}
            <SidebarMenuItem>
              <ThemeToggleButton />
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} className="text-red-400 hover:bg-red-500/20 hover:text-red-300 w-full">
                    <LogOut className="w-5 h-5" />
                    <span>लॉगआउट</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
        <div className="text-center text-xs text-white/50 mt-4">
          <p>Version 1.0.0</p>
          <p>आपकी सफलता का साथी</p>
        </div>
      </SidebarFooter>
    </div>
  );
}


function TopBar() {
  const { isMobile } = useSidebar();
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
      if (!user) return null;
      return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: appUser } = useDoc<AppUser>(userDocRef);
  
  const handleLogout = async () => {
    localStorage.removeItem("admin_security_verified");
    await auth.signOut();
    router.push('/login');
  };

  const userAvatar = PlaceHolderImages.find(img => img.id === 'user-avatar-1');
  const userName = appUser?.fullName || user?.email || "User";
  const userInitial = (appUser?.fullName || user?.email || "U").charAt(0).toUpperCase();

  const avatarBgColor = React.useMemo(() => user ? generateColorFromString(user.uid) : '#cccccc', [user]);
  
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
      <SidebarTrigger className={cn(!isMobile && "hidden")}/>
      <div className="flex-1 flex items-center gap-2">
         <BookOpenCheck className="w-7 h-7 text-primary" />
         <h1 className="font-headline text-xl font-bold gradient-text">MPPSC & Civil Notes</h1>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
               {userAvatar && false ? <AvatarImage src={userAvatar.imageUrl} alt={userName} data-ai-hint={userAvatar.imageHint}/> : null}
                <AvatarFallback style={{ backgroundColor: avatarBgColor }} className="text-white font-bold text-lg">
                    {userInitial}
                </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>मेरा अकाउंट</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>सेटिंग्स</DropdownMenuItem>
          <DropdownMenuItem>प्रोफाइल</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-500 focus:bg-red-500/10">लॉगआउट</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { isUserLoading, user } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  // This effect handles redirection based on auth state.
  React.useEffect(() => {
    // If auth state is still loading, do nothing.
    if (isUserLoading) {
      return;
    }
    // If auth is loaded and there is no user, redirect to login page,
    // but only if they aren't already on the login or splash page.
    if (!user && pathname !== '/login' && pathname !== '/') {
        router.replace('/login');
    }
    // If a user is logged in and they are on the login or splash page,
    // redirect them to the home page.
    if (user && (pathname === '/login' || pathname === '/')) {
      router.replace('/home');
    }

  }, [isUserLoading, user, router, pathname]);

  // While checking auth state, show a global loader for protected pages.
  const protectedPaths = ['/home', '/combos', '/papers', '/admin', '/privacy-policy', '/terms-conditions'];
  if (isUserLoading && protectedPaths.some(p => pathname.startsWith(p))) {
    return (
        <div className="flex h-screen items-center justify-center bg-background">
            <LoaderCircle className="w-10 h-10 animate-spin text-primary" />
        </div>
    )
  }

  // Allow access to login and splash page without showing the main app layout.
  if (pathname === '/login' || pathname === '/') {
    return <>{children}</>;
  }

  // If we have a user, show the main app layout.
  // The check for `user` here prevents a flash of the layout before redirection.
  if (user) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <Sidebar collapsible="offcanvas" className="w-72">
            <AppSidebar />
          </Sidebar>
          <div className="flex flex-col flex-1">
              <TopBar />
              <SidebarInset className="bg-transparent p-0 m-0 rounded-none shadow-none md:m-0 md:rounded-none md:shadow-none min-h-0">
                  {children}
              </SidebarInset>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  // If no user and not loading, this will be briefly rendered before redirection kicks in.
  // A loading screen here can prevent seeing an empty page.
  return (
    <div className="flex h-screen items-center justify-center bg-background">
        <LoaderCircle className="w-10 h-10 animate-spin text-primary" />
    </div>
  );
}
