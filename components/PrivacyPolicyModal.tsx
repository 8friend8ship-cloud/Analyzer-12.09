
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
          <p><strong>최종 업데이트: 2026년 1월 7일</strong></p>

          <section>
            <h3 className="font-bold text-white mb-2">1. 총칙</h3>
            <p>Content OS(이하 '서비스')는 귀하의 개인정보를 중요시하며, 정보통신망 이용촉진 및 정보보호 등에 관한 법률을 준수하고 있습니다. 본 개인정보처리방침을 통해 귀하가 제공하는 개인정보가 어떠한 용도와 방식으로 이용되고 있으며, 개인정보보호를 위해 어떠한 조치가 취해지고 있는지 알려드립니다.</p>
          </section>

          <section>
            <h3 className="font-bold text-white mb-2">2. YouTube API 서비스 사용 고지 (Policy III.A.2.b)</h3>
            <p>본 서비스는 YouTube API 서비스를 사용하여 YouTube로부터 데이터를 수집하고 표시합니다. 따라서 귀하는 본 서비스를 이용함으로써 Google 개인정보처리방침에 동의하는 것으로 간주됩니다.</p>
            <p className="mt-2">
              <a href="http://www.google.com/policies/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                Google 개인정보처리방침 (http://www.google.com/policies/privacy)
              </a>
            </p>
          </section>

          <section>
            <h3 className="font-bold text-white mb-2">3. 수집하는 개인정보의 항목 및 수집 방법 (Policy III.A.2.d)</h3>
            <p>본 서비스는 다음과 같은 정보를 수집하고 사용합니다:</p>
            <ul className="list-disc list-inside pl-4 mt-2 space-y-1">
              <li><strong>Google 계정 정보:</strong> Google 계정으로 로그인 시, 귀하의 이름과 이메일 주소를 인증 및 식별 목적으로 수집합니다.</li>
              <li><strong>YouTube API 데이터:</strong> 서비스 기능 수행을 위해 공개된 YouTube 데이터(채널 정보, 동영상 통계, 댓글 등)에 접근합니다. 민감한 개인 정보나 비공개 데이터는 수집하지 않습니다.</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-white mb-2">4. 정보의 사용, 처리 및 공유 (Policy III.A.2.e)</h3>
            <p>수집된 정보는 다음과 같은 목적으로 사용됩니다:</p>
            <ul className="list-disc list-inside pl-4 mt-2 space-y-1">
              <li><strong>서비스 제공:</strong> YouTube 데이터 분석 기능 제공, 사용자 계정 관리.</li>
              <li><strong>내부 분석:</strong> 서비스 개선 및 통계 분석.</li>
            </ul>
            <p className="mt-2">본 서비스는 귀하의 정보를 제3자와 공유하거나 외부로 유출하지 않습니다. 모든 데이터 처리는 서비스 내부에서만 이루어집니다.</p>
          </section>
          
          <section>
            <h3 className="font-bold text-white mb-2">5. 쿠키 및 기기 정보 (Policy III.A.2.g)</h3>
            <p>본 서비스는 Google 로그인 인증 절차의 일부로 쿠키를 사용할 수 있습니다. 또한, 서비스 이용 기록, 접속 로그, 브라우저 종류 등의 정보가 자동으로 생성되어 수집될 수 있습니다. 이는 서비스 안정성 확보 및 부정 이용 방지를 위해 사용되며, 개인을 식별하는 정보는 포함하지 않습니다.</p>
          </section>

          <section>
            <h3 className="font-bold text-white mb-2">6. 연락처 정보 (Policy III.A.2.i)</h3>
            <p>개인정보처리방침에 대한 문의사항이 있으신 경우, 아래의 연락처로 문의해주시기 바랍니다.</p>
            <ul className="list-disc list-inside pl-4 mt-2 space-y-1">
              <li><strong>서비스 관리자:</strong> Johnson (Content OS)</li>
              <li><strong>이메일:</strong> 8friend8ship@hanmail.net</li>
            </ul>
          </section>
        </div>
        <div className="p-4 border-t border-gray-700 text-right">
          <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-md">닫기</button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyModal;
