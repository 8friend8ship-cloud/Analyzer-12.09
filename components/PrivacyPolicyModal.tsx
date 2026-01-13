import React from 'react';

interface PrivacyPolicyModalProps {
  onClose: () => void;
}

const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">개인정보처리방침 (Privacy Policy)</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto text-sm text-gray-300 space-y-4">
          <p><strong>Last Updated: January 10, 2026</strong></p>

          <section>
            <h3 className="font-bold text-white mb-2">1. 총칙 (General Provisions)</h3>
            <p>Content OS(이하 '서비스')는 귀하의 개인정보를 중요시하며, 정보통신망 이용촉진 및 정보보호에 관한 법률을 준수하고 있습니다. 본 개인정보처리방침은 귀하가 제공하는 개인정보가 어떠한 용도와 방식으로 이용되고 있으며, 개인정보보호를 위해 어떠한 조치가 취해지고 있는지 알려드립니다.</p>
            <p className="text-gray-400 mt-2 text-xs">Content OS (hereinafter the "Service") values your privacy and complies with the Act on Promotion of Information and Communications Network Utilization and Information Protection, etc. This Privacy Policy informs you of the purposes and methods for which the personal information you provide is being used and what measures are being taken to protect your personal information.</p>
          </section>

          <section>
            <h3 className="font-bold text-white mb-2">2. YouTube API 서비스 사용 고지 (Notice of Use of YouTube API Services)</h3>
            <p>본 서비스는 YouTube API 서비스를 사용하여 YouTube의 데이터를 수집하고 표시합니다. 본 서비스를 사용함으로써 귀하는 Google 개인정보처리방침에 동의하는 것으로 간주됩니다.</p>
            <p className="text-gray-400 mt-2 text-xs">The Service uses YouTube API Services to collect and display data from YouTube. By using the Service, you are agreeing to be bound by the Google Privacy Policy.</p>
            <p className="mt-2">
              <a href="http://www.google.com/policies/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                Google 개인정보처리방침 (Google Privacy Policy)
              </a>
            </p>
          </section>

          <section>
            <h3 className="font-bold text-white mb-2">3. 수집하는 개인정보의 항목 및 수집 방법 (Information We Collect and How We Collect It)</h3>
            <p>본 서비스는 YouTube API 정책을 준수하여 다음 정보를 수집하고 사용합니다:</p>
            <p className="text-gray-400 mt-2 text-xs">In compliance with YouTube API policies, the Service collects and uses the following information:</p>
            <div className="pl-4 mt-2 space-y-2">
                <h4 className="font-semibold text-gray-200 mt-3 mb-1">3.1. Google 계정 정보 (Google Account Information)</h4>
                <p>Google 계정으로 로그인 시, 인증 및 서비스 개인화 목적으로만 귀하의 이름과 이메일 주소를 수집합니다.</p>
                <p className="text-gray-400 mt-2 text-xs">When logging in with a Google account, we collect your name and email address solely for authentication and service personalization purposes.</p>

                <h4 className="font-semibold text-gray-200 mt-3 mb-1">3.2. YouTube Data API</h4>
                <p>동영상 제목, 썸네일, 공개 통계(조회수, 좋아요 수), 채널 정보 등 공개된 데이터에 접근하는 데 사용됩니다. 일반 채널이나 키워드를 분석하는 모든 기능은 전적으로 이 공개 데이터를 기반으로 합니다.</p>
                <p className="text-gray-400 mt-2 text-xs">The API is used to access public data such as video titles, thumbnails, public statistics (views, likes), and channel information. All features that analyze general channels or keywords are based entirely on this public data.</p>
                
                <h4 className="font-semibold text-gray-200 mt-3 mb-1">3.3. YouTube Analytics API (인증된 사용자 채널 전용) (For Authenticated User Channels Only)</h4>
                <p>본 서비스의 특정 기능('AI 채널 진단'의 인증 모드 등)은 사용자가 Google OAuth 인증을 통해 **자신이 소유한 YouTube 채널**에 대한 접근 권한을 명시적으로 부여한 경우에만 YouTube Analytics API를 사용합니다. 본 서비스는 사용자가 인증하지 않은 타인 채널의 비공개 Analytics 데이터(추정 수익, 비공개 시청자 통계 등)에 접근하거나, 이를 요청하거나, 표시하지 않습니다.</p>
                <p className="mt-1 text-xs text-yellow-300 bg-yellow-900/20 p-2 rounded-md border border-yellow-500/30">
                  (Specific features of the Service, such as the authenticated mode of 'AI Channel Diagnosis', use the YouTube Analytics API **only when the user explicitly grants access to their own YouTube channel** via Google OAuth authentication. The Service does not access, request, or display private Analytics data for any third-party channel that the user has not authenticated.)
                </p>

                <h4 className="font-semibold text-gray-200 mt-3 mb-1">3.4. 데이터 저장 및 캐싱 (Data Storage and Caching)</h4>
                <p>YouTube 개발자 정책(III.E.4)을 엄격히 준수하여, YouTube API 데이터를 30일 이상 서버에 영구적으로 저장, 캐시 또는 보관하지 않음을 명시적으로 선언합니다. 모든 분석은 실시간으로 수행되거나 이 기간 제한을 준수하는 임시 캐시를 사용합니다.</p>
                <p className="text-gray-400 mt-2 text-xs">In strict compliance with YouTube Developer Policies (III.E.4), we explicitly declare that we do not permanently store, cache, or retain YouTube API data on servers for more than 30 days. All analyses are performed in real-time or use temporary caches that adhere to this time limit.</p>
            </div>
          </section>

          <section>
            <h3 className="font-bold text-white mb-2">4. 정보의 사용, 처리 및 공유 (Use, Processing, and Sharing of Information)</h3>
            <p>수집된 데이터는 통계 요약 및 시각화를 제공하는 서비스의 핵심 기능을 위해 처리됩니다. 서비스는 YouTube API 서비스 약관에 위배되는 방식으로 API 데이터를 리버스 엔지니어링, 집계 또는 오용하지 않습니다. 또한, 수집된 사용자 데이터 또는 API 데이터를 광고주나 데이터 브로커 등 제3자에게 공유하거나 판매하지 않습니다.</p>
            <p className="text-gray-400 mt-2 text-xs">The collected data is processed for the core functionality of the Service, which is to provide statistical summaries and visualizations. The Service does not reverse engineer, aggregate, or misuse API data in a manner that violates the YouTube API Services Terms of Service. Furthermore, we do not share or sell collected user data or API data to third parties such as advertisers or data brokers.</p>
          </section>
          
          <section>
            <h3 className="font-bold text-white mb-2">5. 사용자 권리 및 데이터 삭제 (User Rights and Data Deletion)</h3>
            <p>사용자는 언제든지 Google 보안 설정 페이지를 통해 서비스의 데이터 접근 권한을 철회할 수 있습니다. 철회 시 해당 권한을 통해 검색된 모든 관련 데이터는 당사 시스템에서 삭제됩니다.</p>
            <p className="text-gray-400 mt-2 text-xs">Users can revoke the Service's access to their data at any time via the Google Security Settings page. Upon revocation, all relevant data retrieved through that permission will be deleted from our systems.</p>
             <p className="mt-2">
              <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                Google 보안 설정 (Google Security Settings)
              </a>
            </p>
          </section>

          <section>
            <h3 className="font-bold text-white mb-2">6. 연락처 정보 (Contact Information)</h3>
            <p>본 개인정보처리방침에 대해 질문이 있는 경우, 아래 연락처로 문의주시기 바랍니다:</p>
            <p className="text-gray-400 mt-2 text-xs">If you have any questions about this Privacy Policy, please contact us at the following:</p>
            <ul className="list-disc list-inside pl-4 mt-2 space-y-1">
              <li><strong>서비스 관리자 (Service Administrator):</strong> Johnson (Content OS)</li>
              <li><strong>이메일 (Email):</strong> 8friend8ship@hanmail.net</li>
            </ul>
          </section>
        </div>
        <div className="p-4 border-t border-gray-700 text-right">
          <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-md">닫기 (Close)</button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyModal;
