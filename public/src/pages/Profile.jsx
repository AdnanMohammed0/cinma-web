import { useState } from 'react';
import { BsGear, BsShieldCheck, BsBell, BsCreditCard, BsQuestionCircle, BsBoxArrowRight, BsPencil, BsCamera } from 'react-icons/bs';

const settings = [
  { icon: BsBell, label: 'Notifications', desc: 'Push notifications, email alerts' },
  { icon: BsCreditCard, label: 'Subscription', desc: 'Manage your plan' },
  { icon: BsShieldCheck, label: 'Privacy', desc: 'Account security, data' },
  { icon: BsQuestionCircle, label: 'Help & Support', desc: 'FAQ, contact us' },
];

export default function Profile() {
  const [userName, setUserName] = useState('Guest User');

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 desktop:pt-24 pb-8">
      {/* Profile Header */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative mb-4">
          <div className="w-20 h-20 rounded-full bg-dark-700 flex items-center justify-center text-2xl font-bold text-white/50">
            {userName.charAt(0).toUpperCase()}
          </div>
          <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-accent-yellow rounded-full flex items-center justify-center text-black">
            <BsCamera className="text-xs" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">{userName}</h1>
          <button className="text-white/30 hover:text-white transition-colors">
            <BsPencil className="text-sm" />
          </button>
        </div>
        <p className="text-sm text-white/40 mt-1">guest@watchparty.app</p>

        {/* Stats */}
        <div className="flex gap-8 mt-6">
          <div className="text-center">
            <p className="text-lg font-bold">0</p>
            <p className="text-[10px] text-white/40">Watch Parties</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">0</p>
            <p className="text-[10px] text-white/40">Movies Watched</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">0</p>
            <p className="text-[10px] text-white/40">Favorites</p>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="space-y-1">
        {settings.map(({ icon: Icon, label, desc }) => (
          <button
            key={label}
            className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-dark-800 transition-colors text-left"
          >
            <div className="w-10 h-10 bg-dark-700 rounded-xl flex items-center justify-center flex-shrink-0">
              <Icon className="text-lg text-white/50" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-white/30">{desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Logout */}
      <button className="w-full flex items-center gap-3 p-4 mt-4 rounded-xl hover:bg-dark-800 transition-colors text-left text-red-400">
        <BsBoxArrowRight className="text-lg" />
        <span className="text-sm font-medium">Sign Out</span>
      </button>
    </div>
  );
}
