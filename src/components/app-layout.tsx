

"use client";

import * as React from "react";
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
  CircleDollarSign,
  Menu,
  MessageCircle,
  BookMarked,
  History
} from "lucide-react";
import { useUser, useAuth, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc, getDoc } from 'firebase/firestore';

import {
  SidebarProvider,
  Sidebar,
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


const userMenuItems = [
  { icon: Home, label: "होम", href: "/home" },
  { icon: BookCopy, label: "All Combos", href: "/combos" },
  { icon: MessageCircle, label: "लाइव चैट", href: "/live-chat"},
  { icon: BookMarked, label: "इम्पोर्टेन्ट ट्यूटोरियल", href: "/tutorials" },
];

const adminMenuItems = [
  { icon: Home, label: "होम", href: "/home" },
  { icon: MessageCircle, label: "एडमिन लाइव चैट", href: "/admin/live-chat" },
  { icon: History, label: "ट्रांजेक्शन हिस्ट्री", href: "/admin/transactions" },
];


const bottomMenuItems = [
    { icon: FileText, label: "Privacy Policy", href: "/privacy-policy" },
    { icon: ShieldCheck, label: "Terms & Conditions", href: "/terms-conditions" },
    { icon: CircleDollarSign, label: "Refund Policy", href: "/refund-policy" },
]

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
  
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [isLoadingRole, setIsLoadingRole] = React.useState(true);

  const userDocRef = useMemoFirebase(() => {
      if (!user) return null;
      return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: appUser } = useDoc<AppUser>(userDocRef);
  
  React.useEffect(() => {
    if (appUser) {
        setIsAdmin(appUser.role === 'admin');
        setIsLoadingRole(false);
    } else if (user) {
        // If appUser is not loaded yet, wait.
        setIsLoadingRole(true);
    } else {
        setIsLoadingRole(false);
    }
  }, [appUser, user]);

  const handleLogout = async () => {
    localStorage.removeItem("admin_security_verified");
    await auth.signOut();
    router.push('/login');
  };

  const userName = appUser?.fullName || user?.email || "User";
  const userRole = appUser?.role;
  const userInitial = (appUser?.fullName || user?.email || "U").charAt(0).toUpperCase();

  const avatarBgColor = React.useMemo(() => user ? generateColorFromString(user.uid) : '#cccccc', [user]);

  const handleMenuItemClick = () => {
    setOpenMobile(false);
  }
  
  const currentMenuItems = isAdmin ? adminMenuItems : userMenuItems;

  return (
    <div className="bg-gradient-to-b from-blue-900 via-purple-900 to-teal-900 h-full flex flex-col">
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 border-2 border-white/50">
            <AvatarFallback style={{ backgroundColor: avatarBgColor }} className="text-white font-bold text-lg">
                {userInitial}
            </AvatarFallback>
          </Avatar>
          <div className="text-white">
            <p className="font-semibold">{userName}</p>
            <p className="text-xs text-white/70">{userRole === 'admin' ? 'एडमिनिस्ट्रेटर' : 'MPSE / State Exam'}</p>
          </div>
        </div>
      </div>

      <SidebarContent className="p-2 flex-1">
         {isLoadingRole ? (
            <div className="flex justify-center items-center h-full"><LoaderCircle className="w-6 h-6 animate-spin text-white"/></div>
         ) : (
            <SidebarMenu>
              {currentMenuItems.map((item) => (
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

  const userName = appUser?.fullName || user?.email || "User";
  const userInitial = (appUser?.fullName || user?.email || "U").charAt(0).toUpperCase();

  const avatarBgColor = React.useMemo(() => user ? generateColorFromString(user.uid) : '#cccccc', [user]);
  
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6" style={{'--top-bar-height': '4rem'} as React.CSSProperties}>
      <SidebarTrigger className={cn(!isMobile && "hidden")} />
      <div className="flex-1 flex items-center gap-2">
         <h1 className="font-headline text-xl font-bold gradient-text">MPPSC & Civil Notes</h1>
      </div>
       <Button variant="ghost" className="relative text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 hover:text-white" onClick={() => router.push('/live-chat')}>
          <MessageCircle className="w-5 h-5 mr-2"/>
          लाइव चैट
       </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
                <AvatarFallback style={{ backgroundColor: avatarBgColor }} className="text-white font-bold text-lg">
                    {userInitial}
                </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>मेरा अकाउंट</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push('/tutorials')}>इम्पोर्टेन्ट ट्यूटोरियल</DropdownMenuItem>
          <DropdownMenuItem>सेटिंग्स</DropdownMenuItem>
          <DropdownMenuItem>प्रोफाइल</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-500 focus:bg-red-500/10">लॉगआउट</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

export function AppLayout({ children, hideHeader = false }: { children: React.ReactNode, hideHeader?: boolean }) {
  const { isUserLoading, user } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (isUserLoading) {
      return;
    }
    if (!user && pathname !== '/login' && pathname !== '/') {
        router.replace('/login');
    }
    if (user && (pathname === '/login' || pathname === '/')) {
      router.replace('/home');
    }

  }, [isUserLoading, user, router, pathname]);

  const protectedPaths = ['/home', '/combos', '/papers', '/admin', '/privacy-policy', '/terms-conditions', '/refund-policy', '/live-chat', '/tutorials'];
  if (isUserLoading && protectedPaths.some(p => pathname.startsWith(p))) {
    return (
        <div className="flex h-screen items-center justify-center bg-background">
            <LoaderCircle className="w-10 h-10 animate-spin text-primary" />
        </div>
    )
  }

  if (pathname === '/login' || pathname === '/') {
    return <>{children}</>;
  }

  if (user) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <Sidebar collapsible="offcanvas" className="w-72">
            <AppSidebar />
          </Sidebar>
          <div className="flex flex-col flex-1">
              {!hideHeader && <TopBar />}
              <SidebarInset className="bg-transparent p-0 m-0 rounded-none shadow-none md:m-0 md:rounded-none md:shadow-none min-h-0">
                  {children}
              </SidebarInset>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-background">
        <LoaderCircle className="w-10 h-10 animate-spin text-primary" />
    </div>
  );
}

