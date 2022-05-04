import axios from 'axios'
import moment from 'moment'

const GAHConst = {
  CALINST_TYPE_AVAILABLE: 'available'
}
let counselorCalinst:any
let clientRequestCalinst:any
let counselorApprovedCalinst:any

export default async (context:any) => {
  //Create an availability on the client
  const openslotStart = moment().add(3,'hour').startOf('hour')
  const openslotEnd = moment(openslotStart).add(1,'hour')
  const calInst = {
    calinst_type: GAHConst.CALINST_TYPE_AVAILABLE,
    calinst_start: openslotStart.toDate(),
    calinst_end: openslotEnd.toDate(),
    calinst_user_guid: GAHConst.CALINST_TYPE_AVAILABLE
  }

  //STEP 1: Create the availability as the testCounselor
  const setNearAvailUrl = `${context.extmsMeetingUrl}/calinst/create`;
  const createAvailResponse = await axios.post(setNearAvailUrl, { calInst })
    .then(res => res)
  console.log('Create response: %d', createAvailResponse.status)
  
  if ( createAvailResponse.status == 201 ) {
    counselorCalinst = await createAvailResponse
    console.log('Counselor availability created %O', counselorCalinst)
  } else return createAvailResponse.status

  if ( counselorCalinst[0].calinst_user_guid,context.testCounselorGuid == 0 ) return counselorCalinst[0].calinst_user_guid,context.testCounselorGuid

  //STEP 2: Now as client look for a meeting availability starting in two hours, and ending in 3.

  //call getMyCounselors
  const getCounselorUrl = `${context.extmsMeUrl}/client/counselor`
  const getCounselorResponse = await axios.get(getCounselorUrl, {
      headers: context.testClientHeaders
    })

  if( getCounselorResponse.status != 200 ) return getCounselorResponse.status
  const counselors:any = await getCounselorResponse
  
  //find counselor
  const matchingCounselorArray = counselors.filter( (c: { user_guid: any }) => c.user_guid === context.testCounselorGuid)
  if ( matchingCounselorArray.length !== 1 ) return matchingCounselorArray.length
  const counselor = matchingCounselorArray[0]

  console.log('Found Target counselor :%O', counselor);

  //getAvailabilityForUserGuid
  const counselorAvailabilityUrl = `${context.extmsMeetingUrl}/calinst/user/${counselor.user_guid}`
  const counselorAvailabilityResponse = await axios.get(counselorAvailabilityUrl, {
      headers: context.testClientHeaders
    })

  if ( counselorAvailabilityResponse.status !== 200 ) return false
  const counselorAvailabilityRecs:any = await counselorAvailabilityResponse

  console.log('Near availability found: %O', counselorAvailabilityRecs)
  console.log('Near availability length:%d', counselorAvailabilityRecs.length)

  if ( counselorAvailabilityRecs.length !== 1 ) return counselorAvailabilityRecs.length

  //STEP 3- We found an available slot - Make a reservation request for this timeframe.
  const targetAvailability = counselorAvailabilityRecs[0] 
  if ( targetAvailability.calinst_user_guid,context.testCounselorGuid == null ) return false
  const reserveUrl = `${context.extmsMeetingUrl}/calinst/reserve/id/${targetAvailability.calinst_guid}`
  const patchObj = {
      calinst_subject: 'This is the subject of the meeting',
      calinst_body: 'This is some detail about the meeting'
    }
  const patchResponse = await axios.patch(reserveUrl, {
      headers: context.testClientHeaders,
      body: JSON.stringify(patchObj)
    })
  if ( patchResponse.status !== 200 ) return patchResponse.status
  clientRequestCalinst = await patchResponse
  if ( clientRequestCalinst.calinst_client_guid,context.testClientGuid == null ) return false
  console.log('Patched CalInst: %O', clientRequestCalinst)

  //STEP 4 - Counselor approves request. they should be the same
  console.log('@@@@ counselorCalInst: %O', counselorCalinst)
  console.log('#### clientRequestCalinst: %O', clientRequestCalinst)
  if ( counselorCalinst[0].calinst_guid !== clientRequestCalinst.calinst_guid ) return false
  const approvePendingUrl = `${context.extmsMeetingUrl}/calinst/pendingapprove/${clientRequestCalinst.calinst_guid}`;
  const approvePendingResponse = await axios.patch(approvePendingUrl, {
      headers: context.testCounselorHeaders
    })

  if ( approvePendingResponse.status != 200 ) return approvePendingResponse.status
  counselorApprovedCalinst = await approvePendingResponse
  console.log('Approved object:%O',counselorApprovedCalinst)
  if ( counselorApprovedCalinst.calinst_client_guid,context.testClientGuid == null ) return counselorApprovedCalinst.calinst_client_guid,context.testClientGuid
}