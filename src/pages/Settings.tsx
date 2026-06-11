import React from "react";
import { useNavigate } from "react-router-dom";
import { 
  ChevronLeft, 
  User, 
  Bell, 
  ShieldCheck, 
  Info, 
  LogOut,
  ChevronRight
} from "lucide-react";
import { useUser } from "../context/UserContext";

export default function Settings() {
  const navigate = useNavigate();
  const { signOut } = useUser();

  const settingsOptions = [
    { icon: User, label: "Profile", path: "/edit-profile" },
    { icon: Bell, label: "Notifications", path: "/notifications" },
    { icon: ShieldCheck, label: "Privacy & Safe", path: "/privacy" },
    { icon: Info, label: "About", path: "/about" },
  ];

  const handleSignOut = () => {
    signOut();
    navigate('/auth', { state: { mode: 'signup' }, replace: true });
  };

  return (
    <div className="h-screen overflow-y-auto bg-white text-black">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 h-16 flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      {/* Options List */}
      <div className="mt-4">
        {settingsOptions.map((option, index) => (
          <button
            key={index}
            onClick={() => navigate(option.path)}
            className="w-full flex items-center justify-between px-6 py-5 hover:bg-gray-50 transition-colors border-b border-gray-50"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <option.icon className="w-5 h-5 text-gray-600" />
              </div>
              <span className="font-semibold text-lg">{option.label}</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        ))}

        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-between px-6 py-5 hover:bg-red-50 transition-colors border-b border-gray-50 group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition-colors">
              <LogOut className="w-5 h-5 text-red-600" />
            </div>
            <span className="font-semibold text-lg text-red-600">Sign Out</span>
          </div>
          <ChevronRight className="w-5 h-5 text-red-300" />
        </button>
      </div>

    </div>
  );
}
