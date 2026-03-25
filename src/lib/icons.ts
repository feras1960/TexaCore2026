/**
 * Icons System - نظام الأيقونات الموحد
 * =====================================
 * يحتوي على جميع الأيقونات المستخدمة في التطبيق
 * مصنفة حسب الاستخدام لسهولة الوصول
 */

import {
  // التنقل - Navigation
  Home,
  Menu,
  Search,
  Bell,
  Settings,
  LogOut,
  LogIn,
  
  // الإجراءات - Actions
  Plus,
  Edit,
  Trash2,
  Save,
  Copy,
  Download,
  Upload,
  RefreshCw,
  Printer,
  Share2,
  Filter,
  Eye,
  EyeOff,
  Check,
  X,
  Clipboard,
  Link,
  ExternalLink,
  SortAsc,
  SortDesc,
  MoreHorizontal,
  MoreVertical,
  Maximize2,
  Minimize2,
  Move,
  RotateCcw,
  RotateCw,
  
  // الاتجاهات - Arrows & Directions
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronsUp,
  ChevronsDown,
  
  // الحالات - Status
  CheckCircle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  HelpCircle,
  Loader2,
  CircleDot,
  Circle,
  
  // المستخدمين - Users
  User,
  Users,
  UserPlus,
  UserMinus,
  UserCheck,
  UserX,
  UserCog,
  Users2,
  
  // الأمان - Security
  Lock,
  Unlock,
  Key,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Fingerprint,
  
  // المالية - Finance
  DollarSign,
  CreditCard,
  Wallet,
  Receipt,
  Banknote,
  Coins,
  PiggyBank,
  TrendingUp,
  TrendingDown,
  
  // التجارة - Commerce
  ShoppingCart,
  ShoppingBag,
  Store,
  Package,
  Tag,
  Tags,
  Percent,
  Gift,
  
  // الأماكن - Places & Buildings
  Building,
  Building2,
  Warehouse,
  MapPin,
  Globe,
  Globe2,
  Flag,
  Map,
  Navigation,
  Compass,
  
  // النقل - Transport
  Truck,
  Car,
  Plane,
  Ship,
  Train,
  Bike,
  
  // الملفات - Files & Documents
  File,
  FileText,
  FilePlus,
  FileMinus,
  FileCheck,
  FileX,
  FileSpreadsheet,
  FileImage,
  // FilePdf - not available, use FileText instead
  Folder,
  FolderOpen,
  FolderPlus,
  FolderMinus,
  Image,
  Camera,
  Video,
  FileVideo,
  FileAudio,
  
  // الإحصائيات - Statistics & Charts
  BarChart,
  BarChart2,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  Gauge,
  Target,
  
  // التواصل - Communication
  Mail,
  MailOpen,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  MessageSquare,
  MessageCircle,
  Send,
  Inbox,
  
  // الوقت - Time & Date
  Calendar,
  CalendarDays,
  CalendarCheck,
  CalendarX,
  CalendarPlus,
  Clock,
  Timer,
  History,
  Hourglass,
  
  // التقنية - Technology
  Database,
  Server,
  Code,
  Code2,
  Terminal,
  Smartphone,
  Tablet,
  Monitor,
  Laptop,
  HardDrive,
  Cpu,
  Wifi,
  WifiOff,
  Cloud,
  CloudUpload,
  CloudDownload,
  
  // Git & Dev
  GitBranch,
  GitCommit,
  GitMerge,
  GitPullRequest,
  Github,
  
  // الوسائط - Media
  Mic,
  MicOff,
  Volume,
  Volume1,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  
  // المظهر - Appearance
  Sun,
  Moon,
  Palette,
  Paintbrush,
  Layers,
  Layout,
  LayoutGrid,
  LayoutList,
  Grid,
  List,
  
  // المفضلة - Favorites
  Star,
  Heart,
  Bookmark,
  ThumbsUp,
  ThumbsDown,
  Award,
  Crown,
  Trophy,
  Medal,
  
  // أخرى - Others
  Zap,
  Sparkles,
  Flame,
  Lightbulb,
  Wrench,
  // Tool - not available, use Wrench instead
  Cog,
  Hash,
  AtSign,
  Paperclip,
  Scissors,
  Trash,
  Archive,
  BoxSelect,
  Table,
  Table2,
  Columns,
  Rows,
  Split,
  Merge,
  
  // Types
  type LucideIcon,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════
// تصنيف الأيقونات - Categorized Icons
// ═══════════════════════════════════════════════════════════════════════════

export const icons = {
  // التنقل - Navigation
  nav: {
    Home,
    Menu,
    Search,
    Bell,
    Settings,
    LogOut,
    LogIn,
  },
  
  // الإجراءات - Actions
  actions: {
    Plus,
    Edit,
    Trash2,
    Save,
    Copy,
    Download,
    Upload,
    RefreshCw,
    Printer,
    Share2,
    Filter,
    Eye,
    EyeOff,
    Check,
    X,
    Clipboard,
    Link,
    ExternalLink,
    SortAsc,
    SortDesc,
    MoreHorizontal,
    MoreVertical,
    Maximize2,
    Minimize2,
  },
  
  // الاتجاهات - Arrows
  arrows: {
    ChevronDown,
    ChevronUp,
    ChevronLeft,
    ChevronRight,
    ArrowUp,
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    ArrowUpRight,
    ArrowDownLeft,
    ChevronsUp,
    ChevronsDown,
  },
  
  // الحالات - Status
  status: {
    CheckCircle,
    CheckCircle2,
    XCircle,
    AlertCircle,
    AlertTriangle,
    Info,
    HelpCircle,
    Loader2,
    CircleDot,
    Circle,
  },
  
  // المستخدمين - Users
  users: {
    User,
    Users,
    UserPlus,
    UserMinus,
    UserCheck,
    UserX,
    UserCog,
    Users2,
  },
  
  // الأمان - Security
  security: {
    Lock,
    Unlock,
    Key,
    Shield,
    ShieldCheck,
    ShieldAlert,
    Fingerprint,
  },
  
  // المالية - Finance
  finance: {
    DollarSign,
    CreditCard,
    Wallet,
    Receipt,
    Banknote,
    Coins,
    PiggyBank,
    TrendingUp,
    TrendingDown,
  },
  
  // التجارة - Commerce
  commerce: {
    ShoppingCart,
    ShoppingBag,
    Store,
    Package,
    Tag,
    Tags,
    Percent,
    Gift,
  },
  
  // الأماكن - Places
  places: {
    Building,
    Building2,
    Warehouse,
    MapPin,
    Globe,
    Globe2,
    Flag,
    Map,
    Navigation,
    Compass,
  },
  
  // النقل - Transport
  transport: {
    Truck,
    Car,
    Plane,
    Ship,
    Train,
    Bike,
  },
  
  // الملفات - Files
  files: {
    File,
    FileText,
    FilePlus,
    FileMinus,
    FileCheck,
    FileX,
    FileSpreadsheet,
    Folder,
    FolderOpen,
    FolderPlus,
    Image,
    Camera,
    Video,
  },
  
  // الإحصائيات - Statistics
  stats: {
    BarChart,
    BarChart2,
    BarChart3,
    PieChart,
    LineChart,
    Activity,
    Gauge,
    Target,
    TrendingUp,
    TrendingDown,
  },
  
  // التواصل - Communication
  communication: {
    Mail,
    MailOpen,
    Phone,
    PhoneCall,
    MessageSquare,
    MessageCircle,
    Send,
    Inbox,
    Bell,
  },
  
  // الوقت - Time
  time: {
    Calendar,
    CalendarDays,
    CalendarCheck,
    CalendarX,
    CalendarPlus,
    Clock,
    Timer,
    History,
    Hourglass,
  },
  
  // التقنية - Technology
  tech: {
    Database,
    Server,
    Code,
    Code2,
    Terminal,
    Smartphone,
    Tablet,
    Monitor,
    Laptop,
    HardDrive,
    Cpu,
    Wifi,
    WifiOff,
    Cloud,
    CloudUpload,
    CloudDownload,
  },
  
  // المظهر - Appearance
  appearance: {
    Sun,
    Moon,
    Palette,
    Paintbrush,
    Layers,
    Layout,
    LayoutGrid,
    LayoutList,
    Grid,
    List,
  },
  
  // المفضلة - Favorites
  favorites: {
    Star,
    Heart,
    Bookmark,
    ThumbsUp,
    ThumbsDown,
    Award,
    Crown,
    Trophy,
    Medal,
  },
  
  // الجداول - Tables
  tables: {
    Table,
    Table2,
    Columns,
    Rows,
    Grid,
    LayoutGrid,
    Split,
    Merge,
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// أيقونات الوحدات - Module Icons
// ═══════════════════════════════════════════════════════════════════════════

export const moduleIcons: Record<string, LucideIcon> = {
  // الوحدات الرئيسية
  dashboard: Home,
  invoices: FileText,
  customers: Users,
  products: Package,
  inventory: Warehouse,
  sales: ShoppingCart,
  purchases: ShoppingBag,
  accounting: Receipt,
  reports: BarChart2,
  settings: Settings,
  
  // وحدات إضافية
  users: Users,
  hr: UserCog,
  manufacturing: Building2,
  fleet: Truck,
  exchange: DollarSign,
  pos: Monitor,
  crm: Users2,
  projects: Target,
  assets: HardDrive,
  payroll: Wallet,
  
  // SaaS modules
  tenants: Building,
  subscriptions: CreditCard,
  agents: UserCheck,
  packages: Package,
  support: HelpCircle,
  marketing: Megaphone,
  payments: Banknote,
  analytics: Activity,
};

// ═══════════════════════════════════════════════════════════════════════════
// أيقونات الإجراءات السريعة - Quick Action Icons
// ═══════════════════════════════════════════════════════════════════════════

export const actionIcons: Record<string, LucideIcon> = {
  add: Plus,
  create: Plus,
  new: Plus,
  edit: Edit,
  update: Edit,
  delete: Trash2,
  remove: Trash2,
  view: Eye,
  show: Eye,
  hide: EyeOff,
  save: Save,
  cancel: X,
  close: X,
  confirm: Check,
  approve: CheckCircle,
  reject: XCircle,
  search: Search,
  filter: Filter,
  sort: SortAsc,
  refresh: RefreshCw,
  reload: RefreshCw,
  download: Download,
  export: Download,
  upload: Upload,
  import: Upload,
  print: Printer,
  share: Share2,
  copy: Copy,
  duplicate: Copy,
  paste: Clipboard,
  link: Link,
  more: MoreHorizontal,
  options: MoreVertical,
  expand: Maximize2,
  collapse: Minimize2,
  undo: RotateCcw,
  redo: RotateCw,
  archive: Archive,
  restore: RotateCcw,
};

// ═══════════════════════════════════════════════════════════════════════════
// أيقونات الحالات - Status Icons
// ═══════════════════════════════════════════════════════════════════════════

export const statusIcons: Record<string, LucideIcon> = {
  success: CheckCircle,
  completed: CheckCircle2,
  approved: CheckCircle,
  error: XCircle,
  failed: XCircle,
  rejected: XCircle,
  warning: AlertTriangle,
  alert: AlertCircle,
  info: Info,
  pending: Clock,
  processing: Loader2,
  loading: Loader2,
  help: HelpCircle,
  new: Sparkles,
  active: CircleDot,
  inactive: Circle,
  draft: FileText,
  published: Globe,
  archived: Archive,
};

// ═══════════════════════════════════════════════════════════════════════════
// أيقونات أنواع الملفات - File Type Icons
// ═══════════════════════════════════════════════════════════════════════════

export const fileTypeIcons: Record<string, LucideIcon> = {
  default: File,
  document: FileText,
  pdf: FileText,
  spreadsheet: FileSpreadsheet,
  excel: FileSpreadsheet,
  csv: FileSpreadsheet,
  image: Image,
  photo: Image,
  video: Video,
  audio: Volume2,
  folder: Folder,
  archive: Archive,
  code: Code,
};

// ═══════════════════════════════════════════════════════════════════════════
// أيقونات التنبيهات - Notification Icons
// ═══════════════════════════════════════════════════════════════════════════

export const notificationIcons: Record<string, LucideIcon> = {
  default: Bell,
  message: MessageSquare,
  email: Mail,
  alert: AlertCircle,
  warning: AlertTriangle,
  success: CheckCircle,
  error: XCircle,
  info: Info,
  reminder: Clock,
  mention: AtSign,
  task: CheckCircle2,
  payment: CreditCard,
  order: ShoppingCart,
  delivery: Truck,
};

// ═══════════════════════════════════════════════════════════════════════════
// أيقونات وسائل التواصل - Social Icons
// ═══════════════════════════════════════════════════════════════════════════

export const socialIcons: Record<string, LucideIcon> = {
  github: Github,
  email: Mail,
  phone: Phone,
  website: Globe,
  location: MapPin,
};

// ═══════════════════════════════════════════════════════════════════════════
// Helper function للحصول على أيقونة بالاسم
// ═══════════════════════════════════════════════════════════════════════════

export function getIcon(name: string, category?: keyof typeof icons): LucideIcon | undefined {
  // البحث في فئة محددة
  if (category && icons[category]) {
    const categoryIcons = icons[category] as Record<string, LucideIcon>;
    if (name in categoryIcons) {
      return categoryIcons[name];
    }
  }
  
  // البحث في جميع الفئات
  for (const cat of Object.values(icons)) {
    if (name in cat) {
      return (cat as Record<string, LucideIcon>)[name];
    }
  }
  
  // البحث في أيقونات الوحدات
  if (name in moduleIcons) {
    return moduleIcons[name];
  }
  
  // البحث في أيقونات الإجراءات
  if (name in actionIcons) {
    return actionIcons[name];
  }
  
  return undefined;
}

// ═══════════════════════════════════════════════════════════════════════════
// تصدير جميع الأيقونات من lucide-react
// ═══════════════════════════════════════════════════════════════════════════

export {
  // Navigation
  Home,
  Menu,
  Search,
  Bell,
  Settings,
  LogOut,
  LogIn,
  
  // Actions
  Plus,
  Edit,
  Trash2,
  Save,
  Copy,
  Download,
  Upload,
  RefreshCw,
  Printer,
  Share2,
  Filter,
  Eye,
  EyeOff,
  Check,
  X,
  
  // Arrows
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  
  // Status
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  HelpCircle,
  Loader2,
  
  // Users
  User,
  Users,
  UserPlus,
  UserMinus,
  
  // Security
  Lock,
  Unlock,
  Key,
  Shield,
  
  // Finance
  DollarSign,
  CreditCard,
  Wallet,
  Receipt,
  
  // Commerce
  ShoppingCart,
  ShoppingBag,
  Store,
  Package,
  Tag,
  Tags,
  
  // Places
  Building,
  Building2,
  Warehouse,
  MapPin,
  Globe,
  Flag,
  
  // Transport
  Truck,
  Car,
  
  // Files
  File,
  FileText,
  Folder,
  FolderOpen,
  Image,
  Camera,
  
  // Stats
  BarChart2,
  PieChart,
  Activity,
  TrendingUp,
  TrendingDown,
  
  // Communication
  Mail,
  Phone,
  MessageSquare,
  
  // Time
  Calendar,
  Clock,
  
  // Tech
  Database,
  Server,
  Code,
  Terminal,
  Smartphone,
  Monitor,
  
  // Appearance
  Sun,
  Moon,
  Layers,
  
  // Favorites
  Star,
  Heart,
  Bookmark,
  
  // Others
  Zap,
  Sparkles,
  Crown,
  MoreHorizontal,
  MoreVertical,
  ExternalLink,
  Table,
  Columns,
  
  // Type
  type LucideIcon,
};

// Missing icon that was referenced
import { Megaphone } from "lucide-react";
export { Megaphone };
