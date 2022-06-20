<?php

namespace Squirrel\Helper;

use Squirrel\Model\Member;
use Squirrel\Models\Countries;
use Squirrel\Models\Member_geo;

class MemberGeo
{
    private ?Member $member;

    public function __construct(?Member $member = null)
    {
        $this->memberGeoModel = new Member_geo();

        $this->member = $member;
    }

    /**
     * Save member location data by ip geocode
     *
     * @return bool
     *
     * @throws \Exception if it fails.
     */
    public function setData()
    {
        if (! $ip = $this->getIp()) {
            throw new \Exception('Failed to fetch IP');
        }

        if ($ip === '127.0.0.1') {
            throw new \Exception('Local IP 127.0.0.1');
        }

        try {
            // fetch ip data
            $geoData = $this->getByIp($ip);

            if (isset($geoData['success']) &&  ! $geoData['success']) {
                // TODO log the error messsage

                // in fail case try to get geo data by phone
                $geoData = $this->getByPhone();

                if (! $geoData) {
                    throw new \Exception("Failed to fetch any geo data for user {$this->member->id}");
                }
            } else {
                // keep IP data for future use
                $geoData['latitude'] = $geoData['latitude'] ? str_replace(',', '.', $geoData['latitude']) : null;
                $geoData['longitude'] = $geoData['longitude'] ? str_replace(',', '.', $geoData['longitude']) : null;
                $this->memberGeoModel->saveIpData($geoData);
            }

            $rec = [
                'member_id'    => $this->member->id,
                'country_code' => $geoData['country_code'],
                'country'      => $geoData['country_name'],
                'city'         => $geoData['city'],
                'zip'          => $geoData['zip'],
                'ip'           => $ip,
                'lat'          => $geoData['latitude'],
                'lng'          => $geoData['longitude'],
            ];

            if (isset($geoData['time_zone'])) {
                $rec['tz_name']   = $geoData['time_zone']['id'];
                $rec['tz_offset'] = $geoData['time_zone']['gmt_offset'];
                $rec['tz_code']   = $geoData['time_zone']['code'];
            }

            $this->memberGeoModel->upsert($rec, ['member_id' => $this->member->id]);
        } catch (\Exception $e) {
            throw new \Exception($e->getMessage());
        }
    }

    /**
     * Get member geo data from DB
     *
     * @return object
     */
    public function getData()
    {
        return $this->memberGeoModel->get($this->member->id);
    }

    /**
     * Get geo data by IP
     *
     * @param sring $ip
     * @return array
     */
    public function getByIp(string $ip, ?bool $forceSearch = false): array
    {
        // first check if we have geo data before API call
        $data = $this->memberGeoModel->getIpData($ip);

        if ($forceSearch || ! $data || is_null($data['latitude'])) {
            $data = $this->ipSearch($ip);
        }

        return $data;
    }

    /**
     * Get geo data by IP from API ipstack.com
     *
     * @param sring $ip
     * @return array
     */
    private function ipSearch(string $ip): array
    {
        if (empty(IPSTACK_ACCESS_KEY)) {
            return [
                'success' => false,
                'error' => [
                    'code' => 101,
                    'type' => 'missing_access_key',
                    'info' => 'You have not supplied an API Access Key.'
                ]
            ];
        }

        if (ENVIRONMENT === 'production') {
            $protocol = 'https';
        } else {
            $protocol = 'http';
        }

        $ch = curl_init($protocol . '://api.ipstack.com/' . $ip . '?access_key=' . IPSTACK_ACCESS_KEY);

        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

        $data = json_decode(curl_exec($ch), true);

        curl_close($ch);

        return $data;
    }

    /**
     * Get geo data by phone
     * @return mixed
     */
    public function getByPhone(?string $phone = null)
    {
        $phone = $phone ?? $this->member->phone;

        //if phone hasn't +, add it
        if (substr($phone, 0, 1) !== '+') {
            $phone = '+' . $phone;
        }

        $phoneCountryCode = $this->getCountryCodeByPhone($phone);

        if (! $phoneCountryCode) {
            return false;
        }

        $countries = new Countries();
        $country = $countries->findRow(['short_code' => $phoneCountryCode]);

        if (is_null($country)) {
            return false;
        }

        return [
            'country_id' => $country->id,
            'country_code' => $country->short_code,
            'country' => $country->name,
            'city' => '',
            'zip' => '',
            'ip' => '',
            'latitude' => null,
            'longitude' => null
        ];
    }

    public function getLocalTimestamp(?int $timestamp): int
    {
        $timestamp = $timestamp ?? time();
        return $timestamp + (int) $this->getData()->tz_offset;
    }

    private function getCountryCodeByPhone($phone)
    {
        $phoneNumberUtil = \libphonenumber\PhoneNumberUtil::getInstance();

        try {
            $phoneNumberObject = $phoneNumberUtil->parse($phone, null);

            if ($phoneNumberUtil->isValidNumber($phoneNumberObject)) {
                return $phoneNumberUtil->getRegionCodeForNumber($phoneNumberObject);
            }

            return false;
        } catch (\libphonenumber\NumberParseException $e) {
            // TODO log error
            //$e->getMessage();
            return false;
        }
    }

    /**
     * Get IP from $_SERVER
     * @return mixed
     */
    private function getIp()
    {
        if (! empty($_SERVER['HTTP_CLIENT_IP'])) {
            //ip from share internet
            $ip = $_SERVER['HTTP_CLIENT_IP'];
        } elseif (! empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            //ip pass from proxy
            $ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
        } else {
            $ip = $_SERVER['REMOTE_ADDR'];
        }

        return $ip;
    }
}
